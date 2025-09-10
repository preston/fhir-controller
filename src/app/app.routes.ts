// Author: Preston Lee

import { Routes } from '@angular/router';
import { LoaderComponent } from './loader/loader.component';
import { SettingsComponent } from './settings/settings.component';
import { LibraryComponent } from './library/library.component';
import { ConfigurationEditorComponent } from './configuration-editor/configuration-editor.component';

export const routes: Routes = [
    { path: '', component: LoaderComponent },
    { path: 'settings', component: SettingsComponent },
    { path: 'libraries', component: LibraryComponent },
    { path: 'configuration', component: ConfigurationEditorComponent }
];
