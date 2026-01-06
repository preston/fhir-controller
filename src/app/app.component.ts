// Author: Preston Lee

import { Component, inject } from '@angular/core';
import { RouterOutlet, ActivatedRoute } from '@angular/router';
import { NavigationComponent } from './navigation/navigation.component';
import { SettingsService } from './settings/settings.service';
import { LoaderService } from './loader/loader.service';
import { ToastrService } from 'ngx-toastr';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavigationComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'stack';
  
  // Inject services using inject() function
  public settingsService = inject(SettingsService);
  private loaderService = inject(LoaderService);
  private route = inject(ActivatedRoute);
  private toastrService = inject(ToastrService);

  constructor() {
    // Handle URL parameters for configuration loading
    // Use switchMap to handle nested subscription elegantly
    // takeUntilDestroyed() works in constructor (injection context)
    this.route.queryParams
      .pipe(
        takeUntilDestroyed(),
        switchMap(params => {
          const url = params["url"];
          if (url) {
            console.log('Loading from URL: ' + url);
            return this.loaderService.loadStackConfiguration(url);
          } else {
            console.log('No URL provided. Loading default configuration file.');
            return this.loaderService.loadStackConfiguration();
          }
        })
        // HTTP observables complete automatically after one emission - no cleanup needed
      )
      .subscribe({
        next: () => {
          // Configuration loaded successfully
        },
        error: (error) => {
          // Error handling - check if it was a URL load or default load
          const url = this.route.snapshot.queryParams["url"];
          if (url) {
            this.toastrService.warning("The remote file URL couldn't be loaded, sorry. Check the URL and your connectivity and try again.", "Couldn't load URL");
          } else {
            console.error('Error loading configuration file: stack.json');
            console.error(error);
          }
        }
      });
  }

}
