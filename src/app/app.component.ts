// Author: Preston Lee

import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet, ActivatedRoute } from '@angular/router';
import { NavigationComponent } from './navigation/navigation.component';
import { SettingsService } from './settings/settings.service';
import { LoaderService } from './loader/loader.service';
import { Subscription } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavigationComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'stack';
  private subscriptions: Subscription[] = [];

  constructor(
    public settingsService: SettingsService,
    private loaderService: LoaderService,
    private route: ActivatedRoute,
    private toastrService: ToastrService
  ) {}

  ngOnInit() {
    // Load configuration on app startup
    this.loadConfiguration();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private loadConfiguration() {
    // Handle URL parameters for configuration loading
    const urlSubscription = this.route.queryParams.subscribe({
      next: (params) => {
        let url = params["url"];
        if (url) {
          console.log('Loading from URL: ' + url);
          this.loaderService.loadStackConfiguration(url).subscribe({
            next: () => {
              // Configuration loaded successfully
            },
            error: (e) => {
              this.toastrService.warning("The remote file URL couldn't be loaded, sorry. Check the URL and your connectivity and try again.", "Couldn't load URL");
            }
          });
        } else {
          console.log('No URL provided. Loading default configuration file.');
          this.loaderService.loadStackConfiguration().subscribe({
            next: () => {
              // Configuration loaded successfully
            },
            error: (error) => {
              console.error('Error loading configuration file: stack.json');
              console.error(error);
            }
          });
        }
      }
    });
    this.subscriptions.push(urlSubscription);
  }
}
