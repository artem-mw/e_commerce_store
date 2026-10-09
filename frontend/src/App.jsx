import {useEffect} from "react";
import {Toaster} from "react-hot-toast";

import {useAuthStore} from "./stores/useAuthStore.js";

import AppRouter from "./config/router.jsx";
import Navbar from "./components/general/Navbar.jsx";
import GlobalErrorDisplay from "./components/general/GlobalErrorDisplay.jsx";
import BackgroundGradient from "./components/general/BackgroundGradient.jsx";

function App() {
	const { checkingAuth, checkAuth } = useAuthStore();

	useEffect(() => {
		void checkAuth();
	}, [checkAuth]);

	if (checkingAuth) {
		return (
			<div className="min-h-screen bg-gray-900 text-white flex items-center justify-center relative overflow-hidden">
				<BackgroundGradient />
				<div className="space-y-1">
					<p className="font-medium text-gray-300 animate-pulse">
						Authenticating session...
					</p>
				</div>
			</div>
		);
	}

	return (
        <div className="min-h-screen bg-gray-900 text-white relative overflow-hidden">
	        <BackgroundGradient />
	        <div className="relative z-50">
		        <Navbar />
		        <GlobalErrorDisplay />
		        <AppRouter />
	        </div>
	        <Toaster />
        </div>
    );
}

export default App;
