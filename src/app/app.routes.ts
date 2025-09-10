// Author: Preston Lee

import { Routes } from '@angular/router';
import { LoaderComponent } from './loader/loader.component';
import { SettingsComponent } from './settings/settings.component';
import { LibraryComponent } from './library/library.component';
import { ConfigurationEditorComponent } from './configuration-editor/configuration-editor.component';
import { UsageTutorialComponent } from './learn/usage-tutorial/usage-tutorial.component';
import { BuildYourOwnComponent } from './learn/build-your-own/build-your-own.component';

export const routes: Routes = [
    { path: '', component: LoaderComponent },
    { path: 'settings', component: SettingsComponent },
    { path: 'libraries', component: LibraryComponent },
    { path: 'configuration', component: ConfigurationEditorComponent },
    { path: 'learn/usage-tutorial', component: UsageTutorialComponent },
    { path: 'learn/build-your-own', component: BuildYourOwnComponent }
];
