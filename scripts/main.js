// app.js
import { HomePage } from './pages/home.js';
import { SignInPage } from './pages/signIn.js';
import { logInPage } from './pages/logIn.js';
import { DashboardPage } from './pages/dashboard.js';
import { LogOutPage } from './pages/logOut.js';



// Define routes for the app
router.addRoute('/', HomePage());
router.addRoute('/signIn', SignInPage());
router.addRoute('/logIn', logInPage());
router.addRoute('/dashboard', DashboardPage());
router.addRoute('/logOut', LogOutPage());

