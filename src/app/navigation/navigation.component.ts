// Author: Preston Lee

import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { LoaderService } from '../loader/loader.service';
import { StackConfiguration } from '../loader/stack_configuration';

declare var bootstrap: any;

@Component({
  selector: 'app-navigation',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navigation.component.html',
  styleUrl: './navigation.component.scss'
})
export class NavigationComponent implements OnInit, OnDestroy, AfterViewInit {
  // title = 'FHIR Controller';
  // configuration: StackConfiguration | null = null;
  
  // Navigation items - you can customize these based on your app's needs
  navItems = [
    { label: 'Loader', route: '/', icon: 'bi-upload' },
    { label: 'Configuration', route: '/settings', icon: 'bi-gear' },
    // { label: 'About', route: '/about', icon: 'bi-info-circle' }
  ];

  isCollapsed = true;
  private subscriptions: Subscription[] = [];

  constructor(protected loaderService: LoaderService) {}

  ngOnInit() {
    // Subscribe to configuration changes to update the title
    this.subscriptions.push(
      this.loaderService.configuration$.subscribe(config => {
      })
    );
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

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  toggleNavbar() {
    this.isCollapsed = !this.isCollapsed;
  }
}
