import { Routes, Route } from 'react-router-dom';

import PublicLayout from './components/layout/PublicLayout';
import DashboardLayout from './components/layout/DashboardLayout';
import ProtectedRoute from './components/common/ProtectedRoute';

import Home from './pages/Home/Home';
// import About from './pages/About/About';
// import Contact from './pages/Contact/Contact';
import BrowseFreelancers from './pages/BrowseFreelancers/BrowseFreelancers';
import CandidateDetails from './pages/CandidateDetails/CandidateDetails';
import BrowseJobs from './pages/BrowseJobs/BrowseJobs';
import JobDetails from './pages/JobDetails/JobDetails';
import Technologies from './pages/Technologies/Technologies';
import PricingPage from './pages/Pricing/PricingPage';
import NotFound from './pages/NotFound';

import LoginChoice from './pages/Auth/LoginChoice';
import LoginCandidate from './pages/Auth/LoginCandidate';
import LoginCompany from './pages/Auth/LoginCompany';
import LoginAdmin from './pages/Auth/LoginAdmin';
import Register from './pages/Auth/Register';
import FirebaseEmailLinkComplete from './pages/Auth/FirebaseEmailLinkComplete';
import ForgotPassword from './pages/Auth/ForgotPassword';
import ResetPassword from './pages/Auth/ResetPassword';

import CandidateOverview from './pages/CandidateDashboard/Overview';
import CandidateEditProfile from './pages/CandidateDashboard/EditProfile';
import CandidateNotifications from './pages/CandidateDashboard/Notifications';
import MyApplications from './pages/CandidateDashboard/MyApplications';
import SubscriptionPage from './pages/Subscription/SubscriptionPage';

import CompanyOverview from './pages/CompanyDashboard/Overview';
import CompanyEditProfile from './pages/CompanyDashboard/EditProfile';
import CompanyBookmarks from './pages/CompanyDashboard/Bookmarks';
import CompanyNotifications from './pages/CompanyDashboard/Notifications';
import MyJobs from './pages/CompanyDashboard/MyJobs';
import PostJob from './pages/CompanyDashboard/PostJob';
import JobApplicants from './pages/CompanyDashboard/JobApplicants';

import AdminOverview from './pages/AdminDashboard/Overview';
import AdminUsers from './pages/AdminDashboard/Users';
import AdminCandidates from './pages/AdminDashboard/Candidates';
import AdminCompanies from './pages/AdminDashboard/Companies';
import AdminVerifications from './pages/AdminDashboard/Verifications';
import AdminTaxonomy from './pages/AdminDashboard/Taxonomy';
import AdminReviews from './pages/AdminDashboard/Reviews';
import AdminPricing from './pages/AdminDashboard/Pricing';

/**
 * Top-level route table. Public marketing/browsing routes share PublicLayout
 * (Navbar + Footer); each role's dashboard is gated by ProtectedRoute and
 * shares DashboardLayout (sidebar navigation).
 */
export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        {/* <Route path="/about" element={<About />} /> */}
        {/* <Route path="/contact" element={<Contact />} /> */}
        <Route path="/browse" element={<BrowseFreelancers />} />
        <Route path="/candidates/:id" element={<CandidateDetails />} />
        <Route path="/jobs" element={<BrowseJobs />} />
        <Route path="/jobs/:id" element={<JobDetails />} />
        <Route path="/technologies" element={<Technologies />} />
        <Route path="/pricing" element={<PricingPage />} />

        <Route path="/login" element={<LoginChoice />} />
        <Route path="/login/candidate" element={<LoginCandidate />} />
        <Route path="/login/company" element={<LoginCompany />} />
        <Route path="/login/admin" element={<LoginAdmin />} />
        <Route path="/register" element={<Register />} />
        <Route path="/auth/firebase/complete" element={<FirebaseEmailLinkComplete />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Route>

      {/* Candidate dashboard */}
      <Route element={<ProtectedRoute roles={['candidate']} />}>
        <Route path="/candidate/dashboard" element={<DashboardLayout />}>
          <Route index element={<CandidateOverview />} />
          <Route path="profile" element={<CandidateEditProfile />} />
          <Route path="subscription" element={<SubscriptionPage />} />
          <Route path="applications" element={<MyApplications />} />
          <Route path="notifications" element={<CandidateNotifications />} />
        </Route>
      </Route>

      {/* Company dashboard */}
      <Route element={<ProtectedRoute roles={['company']} />}>
        <Route path="/company/dashboard" element={<DashboardLayout />}>
          <Route index element={<CompanyOverview />} />
          <Route path="profile" element={<CompanyEditProfile />} />
          <Route path="subscription" element={<SubscriptionPage />} />
          <Route path="bookmarks" element={<CompanyBookmarks />} />
          <Route path="jobs" element={<MyJobs />} />
          <Route path="jobs/new" element={<PostJob />} />
          <Route path="jobs/:id/edit" element={<PostJob />} />
          <Route path="jobs/:jobId/applicants" element={<JobApplicants />} />
          <Route path="notifications" element={<CompanyNotifications />} />
        </Route>
      </Route>

      {/* Admin dashboard */}
      <Route element={<ProtectedRoute roles={['admin']} />}>
        <Route path="/admin/dashboard" element={<DashboardLayout />}>
          <Route index element={<AdminOverview />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="candidates" element={<AdminCandidates />} />
          <Route path="companies" element={<AdminCompanies />} />
          <Route path="verifications" element={<AdminVerifications />} />
          <Route path="taxonomy" element={<AdminTaxonomy />} />
          <Route path="reviews" element={<AdminReviews />} />
          <Route path="pricing" element={<AdminPricing />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
