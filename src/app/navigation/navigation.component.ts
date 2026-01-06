// Author: Preston Lee

import { Component, AfterViewInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LoaderService } from '../loader/loader.service';

declare var bootstrap: any;

@Component({
  selector: 'app-navigation',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navigation.component.html',
  styleUrl: './navigation.component.scss'
})
export class NavigationComponent implements AfterViewInit {
  // title = 'FHIR Controller';
  // configuration: StackConfiguration | null = null;
  
  // Navigation items - you can customize these based on your app's needs
  navItems = [
    { label: 'Loader', route: '/', icon: 'bi-upload' },
    { label: 'Configuration', route: '/settings', icon: 'bi-gear' },
    // { label: 'About', route: '/about', icon: 'bi-info-circle' }
  ];

  isCollapsed = true;
  protected loaderService = inject(LoaderService);

  constructor() {
    // No subscriptions needed - configuration is handled by other components
  }

  ngAfterViewInit() {
    // Initialize Bootstrap dropdowns
    if (typeof bootstrap !== 'undefined') {
      const dropdownElementList = [].slice.call(document.querySelectorAll('.dropdown-toggle'));
      dropdownElementList.map(function (dropdownToggleEl) {
        return new bootstrap.Dropdown(dropdownToggleEl);
      });
    }
  }

  toggleNavbar() {
    this.isCollapsed = !this.isCollapsed;
  }
}
