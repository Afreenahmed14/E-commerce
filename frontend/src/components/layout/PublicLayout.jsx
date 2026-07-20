import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import SignupNudge from './SignupNudge';

/** Wraps all public-facing marketing/browsing pages with the shared Navbar + Footer. */
export default function PublicLayout() {
  const location = useLocation();
  return (
    <>
      <Navbar />
      <main key={location.pathname} className="fade-in">
        <Outlet />
      </main>
      <Footer />
      <SignupNudge />
    </>
  );
}
