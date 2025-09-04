// Author: Preston Lee

import { Routes } from '@angular/router';
import { LoaderComponent } from './loader/loader.component';
import { SettingsComponent } from './settings/settings.component';

export const routes: Routes = [
    { path: '', component: LoaderComponent },
    { path: 'settings', component: SettingsComponent }
];
