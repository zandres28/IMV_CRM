import base64, struct, sys

import sys

key_b64 = 'AAAAB3NzaC1yc2EAAAADAQABAAABAQDVQhVJGca2BuKPcAY5r5j+QbgmgV68ivjxIn0n6LZUMxDjXdaU6Cv3/1P5Msm2Nw2IkgojiYJVqTXPFdU/063jGZ3Zm3v2dp61A/dItAmHV303jA6z82hQjJN4tlMmRWlfiS3zt9i7gakaRw07h3Dx/0aO2PoVPcX13TnEoqEVPAqSfLrk3bgWSiY5WzJGPJPRdLS+1PE6pNerUbtR4KD61LOoFDUNchcmG7+1Zla7sQcgZazWO85gBoBSs3PfPV11tsRS+l0X/xowccpj3d24MPwK01D488YSgVOmflFn/TG0H7VSBAxm5574fqE+vrLGchkwZqd2m6b+9e9CX4REd'

print('Original length:', len(key_b64), file=sys.stderr)

# Add padding
key_b64 = key_b64.strip()
pad = (4 - len(key_b64) % 4) % 4
print('Padding needed:', pad, file=sys.stderr)
key_b64 = key_b64 + '=' * pad
print('Padded length:', len(key_b64), file=sys.stderr)
data = base64.b64decode(key_b64)

def parse_mpint(data, offset):
    size = struct.unpack('>I', data[offset:offset+4])[0]
    value = int.from_bytes(data[offset+4:offset+4+size], 'big')
    return value, offset + 4 + size

blob_len = struct.unpack('>I', data[0:4])[0]
ktype_len = struct.unpack('>I', data[4:8])[0]
key_type = data[8:8+ktype_len].decode('ascii')

offset = 8 + ktype_len
e, offset = parse_mpint(data, offset)
n, offset = parse_mpint(data, offset)

# PuTTY uses null-terminated strings, not length-prefixed
blob_data = b'ssh-rsa\x00'

exp_bytes = e.to_bytes((e.bit_length() + 7) // 8, 'big')
blob_data += struct.pack('>I', len(exp_bytes)) + exp_bytes

mod_bytes = n.to_bytes((n.bit_length() + 7) // 8, 'big')
blob_data += struct.pack('>I', len(mod_bytes)) + mod_bytes

final_blob = struct.pack('>I', len(blob_data)) + blob_data
hex_value = '0x' + final_blob.hex()

print(hex_value)
