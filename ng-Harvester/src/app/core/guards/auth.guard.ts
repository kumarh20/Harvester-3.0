import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);

  // Check if user is authenticated
  // For development, you can set: localStorage.setItem('isAuthenticated', 'true');
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';

  if (isAuthenticated) {
    return true;
  } else {
    console.warn('Authentication required. Set localStorage.setItem("isAuthenticated", "true") to proceed.');
    // In production, redirect to login: router.navigate(['/login']);
    return true; // Allow access for development
  }
};
