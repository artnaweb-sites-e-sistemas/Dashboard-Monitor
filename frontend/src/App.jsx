import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import SiteDetails from './pages/SiteDetails'
import Settings from './pages/Settings'
import { AuthProvider, useAuth } from './context/AuthContext'
import './App.css'

const queryClient = new QueryClient()

// Protected Route
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? children : <Navigate to="/login" />
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true
          }}
        >
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/site/:id" 
              element={
                <ProtectedRoute>
                  <SiteDetails />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/settings" 
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App

