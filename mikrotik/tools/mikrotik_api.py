#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Minimal RouterOS API client for Python 2.7"""
import socket
import hashlib
import struct
import sys

class RouterOSAPI(object):
    def __init__(self, host, port=8728):
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.sock.settimeout(10)
        self.sock.connect((host, port))

    def _encode_length(self, length):
        if length < 0x80:
            return chr(length)
        elif length < 0x4000:
            length |= 0x8000
            return chr((length >> 8) & 0xFF) + chr(length & 0xFF)
        elif length < 0x200000:
            length |= 0xC00000
            return chr((length >> 16) & 0xFF) + chr((length >> 8) & 0xFF) + chr(length & 0xFF)
        elif length < 0x10000000:
            length |= 0xE0000000
            return chr((length >> 24) & 0xFF) + chr((length >> 16) & 0xFF) + chr((length >> 8) & 0xFF) + chr(length & 0xFF)
        else:
            return chr(0xF0) + chr((length >> 24) & 0xFF) + chr((length >> 16) & 0xFF) + chr((length >> 8) & 0xFF) + chr(length & 0xFF)

    def _decode_length(self):
        b = ord(self.sock.recv(1))
        if b & 0x80 == 0:
            return b
        elif b & 0xC0 == 0x80:
            return ((b & 0x3F) << 8) | ord(self.sock.recv(1))
        elif b & 0xE0 == 0xC0:
            b2 = ord(self.sock.recv(1))
            b3 = ord(self.sock.recv(1))
            return ((b & 0x1F) << 16) | (b2 << 8) | b3
        elif b & 0xF0 == 0xE0:
            b2 = ord(self.sock.recv(1))
            b3 = ord(self.sock.recv(1))
            b4 = ord(self.sock.recv(1))
            return ((b & 0x0F) << 24) | (b2 << 16) | (b3 << 8) | b4
        else:
            b2 = ord(self.sock.recv(1))
            b3 = ord(self.sock.recv(1))
            b4 = ord(self.sock.recv(1))
            b5 = ord(self.sock.recv(1))
            return (b2 << 24) | (b3 << 16) | (b4 << 8) | b5

    def _read_word(self):
        length = self._decode_length()
        if length == 0:
            return ''
        data = b''
        while len(data) < length:
            chunk = self.sock.recv(length - len(data))
            if not chunk:
                raise Exception('Connection closed')
            data += chunk
        return data.decode('utf-8', errors='replace')

    def _write_sentence(self, words):
        data = b''
        for word in words:
            if isinstance(word, unicode):
                word = word.encode('utf-8')
            data += self._encode_length(len(word)).encode('latin-1') + word
        data += b'\x00'
        self.sock.sendall(data)

    def _read_sentence(self):
        words = []
        while True:
            word = self._read_word()
            if word == '':
                break
            words.append(word)
        return words

    def _read_response(self):
        responses = []
        while True:
            sentence = self._read_sentence()
            if not sentence:
                continue
            responses.append(sentence)
            if sentence[0] in ('!done', '!trap', '!fatal'):
                break
        return responses

    def login(self, username, password):
        # Try new-style login first (RouterOS 6.43+)
        self._write_sentence(['/login', '=name=' + username, '=password=' + password])
        resp = self._read_response()
        if resp and resp[0][0] == '!done':
            return True
        # Old-style login with challenge
        self._write_sentence(['/login'])
        resp = self._read_response()
        challenge = None
        for sentence in resp:
            for word in sentence:
                if word.startswith('=ret='):
                    challenge = word[5:]
        if challenge:
            md5 = hashlib.md5()
            md5.update('\x00')
            md5.update(password)
            md5.update(challenge.decode('hex'))
            self._write_sentence(['/login', '=name=' + username, '=response=00' + md5.hexdigest()])
            resp = self._read_response()
        return True

    def command(self, cmd_words):
        self._write_sentence(cmd_words)
        return self._read_response()

    def close(self):
        self.sock.close()


def parse_response(responses):
    results = []
    for sentence in responses:
        row = {}
        for word in sentence:
            if word.startswith('='):
                parts = word[1:].split('=', 1)
                if len(parts) == 2:
                    row[parts[0]] = parts[1]
            elif word.startswith('!'):
                row['_type'] = word
        if row:
            results.append(row)
    return results


if __name__ == '__main__':
    import getpass
    host = input('RouterOS host: ') or '192.168.1.9'
    user = input('Username (admin): ') or 'admin'
    passwd = getpass.getpass('Password: ')

    api = RouterOSAPI(host)
    api.login(user, passwd)
    print("=== Connected to RouterOS API ===\n")

    # 1. Print WG interface listen port
    print("--- WG Interface ---")
    resp = api.command(['/interface/wireguard/print'])
    for s in resp:
        for w in s:
            if w.startswith('='):
                print(w)

    # 2. Check NAT rules
    print("\n--- NAT Rules ---")
    resp = api.command(['/ip/firewall/nat/print'])
    for s in resp:
        for w in s:
            if w.startswith('=') or w.startswith('!'):
                print(w)

    # 3. Add mangle output rule to force WG traffic out via WAN2
    # Check if it already exists
    print("\n--- Checking existing output mangle for WG ---")
    resp = api.command(['/ip/firewall/mangle/print',
                        '?chain=output',
                        '?dst-address=149.130.162.188'])
    existing = parse_response(resp)
    print("Found %d output rules for VPS" % len([r for r in existing if r.get('_type') != '!done']))

    # 4. Add output mangle rule if missing
    print("\n--- Adding output routing mark for WG traffic to VPS ---")
    resp = api.command([
        '/ip/firewall/mangle/add',
        '=chain=output',
        '=action=mark-routing',
        '=new-routing-mark=to_WAN2',
        '=passthrough=no',
        '=dst-address=149.130.162.188',
        '=comment=Force WG keepalive to VPS via WAN2'
    ])
    print("Result:", resp)

    # 5. Print current WG peer status
    print("\n--- WG Peer Status ---")
    resp = api.command(['/interface/wireguard/peers/print'])
    for s in resp:
        for w in s:
            if w.startswith('='):
                print(w)

    api.close()
    print("\n=== Done ===")
