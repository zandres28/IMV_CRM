import { createBrowserRouter, Navigate } from 'react-router-dom';
import App from '../App';
import { ClientList } from '../components/clients/ClientList';
import { ClientForm } from '../components/clients/ClientForm';
import { ClientDetail } from '../components/clients/ClientDetail';
import { ServicePlansManager } from '../components/admin/ServicePlansManager';
import { TechniciansManager } from '../components/admin/TechniciansManager';
import MonthlyBilling from '../components/billing/MonthlyBilling';
import QueryDashboard from '../components/dashboard/QueryDashboard';
import ServiceOutageManager from '../components/service-outages/ServiceOutageManager';
import { InteractionManager } from '../components/interactions/InteractionManager';
import InstallationBillingList from '../components/installation-billing/InstallationBillingList';
import Login from '../components/auth/Login';
import PrivateRoute from '../components/auth/PrivateRoute';
import UserManagement from '../components/admin/UserManagement';
import PublicBillingCheck from '../components/public/PublicBillingCheck';
import { ServiceTransferList } from '../components/service-transfers/ServiceTransferList';
import { GeneralDashboard } from '../components/dashboard/GeneralDashboard';
import ApiAccess from '../components/admin/ApiAccess';
import { SystemSettingsConfig } from '../components/admin/SystemSettingsConfig';
import { InteractionTypesManager } from '../components/admin/InteractionTypesManager';
import ServiceRequestForm from '../components/public/ServiceRequestForm';
import RolesManager from '../components/admin/RolesManager';
import { MikrotikGraphs } from '../components/network/MikrotikGraphs';
import { PromotionsManager } from '../components/admin/PromotionsManager';

const router = createBrowserRouter([
    {
        path: "/login",
        element: <Login />
    },
    {
        path: "/consulta-pagos",
        element: <PublicBillingCheck />
    },
    {
        path: "/solicitud",
        element: <ServiceRequestForm />
    },
    {
        path: "/",
        element: <PrivateRoute><App /></PrivateRoute>,
        children: [
            {
                index: true,
                element: <Navigate to="/clients" replace />
            },
            {
                path: "clients",
                element: <ClientList />
            },
            {
                path: "consultas",
                element: <QueryDashboard />
            },
            {
                path: "clients/new",
                element: <ClientForm onSave={() => {}} />
            },
            {
                path: "clients/:id",
                element: <ClientDetail />
            },
            {
                path: "billing",
                element: <MonthlyBilling />
            },
            {
                path: "installation-billing",
                element: <InstallationBillingList />
            },
            {
                path: "service-outages",
                element: <ServiceOutageManager />
            },
            {
                path: "service-transfers",
                element: <ServiceTransferList />
            },
            {
                path: "network/mikrotik",
                element: <MikrotikGraphs />
            },
            {
                path: "dashboard",
                element: <GeneralDashboard />
            },
            {
                path: "interactions",
                element: <InteractionManager />
            },
            {
                path: "admin/service-plans",
                element: <ServicePlansManager />
            },
            {
                path: "admin/technicians",
                element: <TechniciansManager />
            },
            {
                path: "admin/users",
                element: <UserManagement />
            },
            {
                path: "admin/roles",
                element: <RolesManager />
            },
            {
                path: "admin/promotions",
                element: <PromotionsManager />
            },
            {
                path: "admin/api-access",
                element: <ApiAccess />
            },
            {
                path: "admin/settings",
                element: <SystemSettingsConfig />
            },
            {
                path: "admin/interaction-types",
                element: <InteractionTypesManager />
            }
        ]
    }
]);

export default router;