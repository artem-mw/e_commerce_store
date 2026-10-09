import {useEffect} from "react";
import {Routes, Route, Navigate, useLocation} from "react-router-dom";

import {useAuthStore} from "../stores/useAuthStore.js";
import {useCartStore} from "../stores/useCartStore.js";

import {PublicRoutes} from "../routes/PublicRoutes.jsx";
import {AuthRoutes} from "../routes/AuthRoutes.jsx";
import {AdminRoutes} from "../routes/AdminRoutes.jsx";
import {ProtectedRoutes} from "../routes/ProtectedRoutes.jsx";

import EmailVerificationPage from "../pages/auth/EmailVerificationPage.jsx";

const AppRouter = () => {
	const { user } = useAuthStore();
	const { getCartItems } = useCartStore();

	useEffect(() => {
		if (!user) return;
		void getCartItems();
	}, [user, getCartItems]);

    const location = useLocation();

    return (
        <div className="pt-16">
                <Routes location={location}>
			        {PublicRoutes}
			        {AuthRoutes}
			        {AdminRoutes}
			        {ProtectedRoutes}

			        <Route path="/verify-email" element={
				        user && !user.isVerified
					        ? <EmailVerificationPage />
					        : <Navigate to='/' />
			        } />
                </Routes>
        </div>
    );
}

export default AppRouter;