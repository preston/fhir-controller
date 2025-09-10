// Author: Preston Lee

import { Injectable, OnInit } from '@angular/core';
import { Settings, ThemeType } from './settings';

@Injectable()
export class SettingsService implements OnInit {

  public static SETTINGS_KEY: string = "fhir_controller_settings";
  public static FORCE_RESET_KEY: string = "fhir_controller_settings_force_reset";

  public settings: Settings = new Settings;
  public force_reset: boolean = false;
  public theme_effective: ThemeType.DARK | ThemeType.LIGHT = ThemeType.LIGHT;

  constructor() {
    this.reload();
    window.matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', ({ matches }) => {
        if (this.settings.theme_preferred == ThemeType.AUTOMATIC) {
          if (matches) {
            this.theme_effective = ThemeType.DARK;
            this.saveSettings();
            console.log("Changed to dark mode!")
          } else {
            this.theme_effective = ThemeType.LIGHT;
            this.saveSettings();
            console.log("Changed to light mode!")
          }
        }
      })
  }

  setEffectiveTheme() {
    if (this.settings.theme_preferred == ThemeType.AUTOMATIC) {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        this.theme_effective = ThemeType.DARK;
        console.log("Theme automatically set to dark mode!")
      } else {
        this.theme_effective = ThemeType.LIGHT;
        console.log("Theme automatically set to light mode!")
      }
    } else {
      this.theme_effective = this.settings.theme_preferred;
      console.log("Theme forced to", this.settings.theme_preferred, "mode!")
    }
  }

  ngOnInit() {
  }

  reload() {
    this.force_reset = (localStorage.getItem(SettingsService.FORCE_RESET_KEY) == 'true' ? true : false);
    if (this.force_reset) {
      this.forceResetToDefaults();
    }
    let tmp = localStorage.getItem(SettingsService.SETTINGS_KEY);
    if (tmp) {
      try {
        this.settings = JSON.parse(tmp)
        let shouldSave = false;
        if (this.settings.experimental == null) {
          this.settings.experimental = false;
          shouldSave = true;
        }
        if (this.settings.developer == null) {
          this.settings.developer = false;
          shouldSave = true;
        }
        if (this.settings.theme_preferred == null) {
          this.settings.theme_preferred = Settings.DEFAULT_THEME;
          shouldSave = true;
        }
        // if (this.settings.stakeout_username == null) {
        //   this.settings.stakeout_username = '';
        //   shouldSave = true;
        // }
        // if (this.settings.stakeout_password == null) {
        //   this.settings.stakeout_password = '';
        //   shouldSave = true;
        // }
        if (shouldSave) {
          this.saveSettings();
          console.log("Settings have been updated to include defalut field values.");
        } else {
          console.log("Settings have been loaded from local browser storage on this device without modification.");
        }
        console.log("Current settings:", this.settings);

      } catch (e) {
        console.log("Settings could not be parsed and are likely not valid JSON. They will be ignored.");
        console.log(e);
      }
    } else {
      this.settings = new Settings();
      this.saveSettings();
    }
    this.setEffectiveTheme();
  }

  forceResetToDefaults() {
    localStorage.clear();
    this.settings = new Settings();
    this.force_reset = false;
    this.saveSettings();
    this.setEffectiveTheme();
    this.reload();
    console.log("All application settings have been restored to their defaults.");
  }

  saveSettings() {
    localStorage.setItem(SettingsService.SETTINGS_KEY, JSON.stringify(this.settings));
    console.log("Your settings have been saved to local browser storage on this device. They will not be sync'd to any other system, even if your browser supports such features.");
  }

}
