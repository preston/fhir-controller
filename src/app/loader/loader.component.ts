// Author: Preston Lee

import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { MomentModule } from 'ngx-moment';
import { MarkdownComponent } from 'ngx-markdown';
import { ToastrService } from 'ngx-toastr';

import { DataFile } from './data_file';
import { LoaderMessage } from './loader_message';
import { StackConfiguration } from './stack_configuration';
import { ActivatedRoute } from '@angular/router';
import { GenericDriver } from '../driver/generic_driver';
import { HapiFhirDriver } from '../driver/hapi_driver';
import { WildFhirDriver } from '../driver/wildfhir_driver';
import { DriverType } from '../driver/driver_type';
import { FhirCandleDriver } from '../driver/fhir_candle_driver';

@Component({
  selector: 'loader',
  standalone: true,
  imports: [CommonModule, FormsModule, MomentModule, MarkdownComponent],
  providers: [],
  templateUrl: './loader.component.html',
  styleUrl: './loader.component.scss'
})
export class LoaderComponent implements OnInit {

  // name = (window as any)["STACK_CONTROLLER_NAME"] || 'Stack Controller';
  // patient_portal_url = (window as any)["PATIENT_PORTAL_BASE_URL"];
  // provider_portal_url = (window as any)["PROVIDER_PORTAL_BASE_URL"];
  // rules_url = (window as any)["RULES_BASE_URL"];
  // cds_url = (window as any)["CDS_BASE_URL"];
  // fhir_base_url = (window as any)["FHIR_BASE_URL"];

  development: boolean = false;

  configuration_file = 'stack.json';
  // configuration_file_url: string | undefined;

  stack_configuration: StackConfiguration = new StackConfiguration();

  // default_files: DataFile[] = [
  // ]
  // driver_type: DriverType = DriverType.Generic;
  driver: GenericDriver = new GenericDriver(this.stack_configuration, this.http);

  files_to_load: DataFile[] = [];
  state: 'default' | 'loading' | 'loaded' = 'default';
  errors: boolean = false;

  messages: LoaderMessage[] = [];


  constructor(
    protected http: HttpClient,
    protected route: ActivatedRoute,
    protected toastrService: ToastrService
  ) {
  }


  ngOnInit() {
    let url = this.route.queryParams.subscribe({
      next: (params) => {
        let url = params["url"];
        if (url) {
          console.log('Loading from URL: ' + url);
          this.configuration_file = url;
          this.http.get<StackConfiguration>(this.configuration_file).subscribe({
            next: (data => {
              this.loadStackConfiguration(data);
            }),
            error: (e => {
              this.toastrService.warning("The remote file URL couldn't be loaded, sorry. Check the URL and your connectivity and try again.", "Couldn't load URL");
            })
          });
        } else {
          console.log('No URL provided. Loading for default configuration file.');
          this.reloadStackConfiguration();
        }
      }
    }
    );
  }
  changeDriver() {
    switch (this.stack_configuration.driver) {
      case DriverType.Hapi:
        this.driver = new HapiFhirDriver(this.stack_configuration, this.http);
        console.log('Using HAPI driver.');
        break;
      case DriverType.WildFHIR:
        this.driver = new WildFhirDriver(this.stack_configuration, this.http);
        console.log('Using WildFHIR driver.');
        break;
      case DriverType.FHIRCandle:
        this.driver = new FhirCandleDriver(this.stack_configuration, this.http);
        console.log('Using FHIR Candle driver.');
        break;
      default:
        // Use the generic driver by default.
        this.stack_configuration.driver = DriverType.Generic;
        this.driver = new GenericDriver(this.stack_configuration, this.http);
        console.log('Using generic driver.');
        break;
    }
  }

  driverTypes() {
    return DriverType;
  }

  reloadStackConfiguration() {
    this.http.get<StackConfiguration>(this.configuration_file).subscribe({
      next: data => {
        this.loadStackConfiguration(data);
      }, error: error => {
        console.error('Error loading configuration file: ' + this.configuration_file);
        console.error(error);
        this.errors = true;
        this.messages.unshift({ type: 'danger', body: 'Error loading configuration file: ' + this.configuration_file, date: new Date() });
        this.toastrService.error( 'Could not load configuration file: ' + this.configuration_file, 'Error Loading Configuration');
      }
    });

  }


  loadStackConfiguration(data: StackConfiguration) {
    this.stack_configuration = data;
    const tmp: DataFile[] = JSON.parse(JSON.stringify(this.stack_configuration.data));
    this.files_to_load = tmp.sort((a, b) => { return a.priority - b.priority });
    this.state = 'default';
    this.changeDriver();
    this.messages.unshift({ type: 'info', body: 'Controller configuration has been reloaded.', date: new Date() });
  }

  load() {
    this.state = 'loading';
    this.messages.unshift({ type: 'info', body: 'Starting load operations...', date: new Date() });
    let filtered = this.files_to_load.filter(f => { return f.load });
    console.log('Loading ' + filtered.length + ' files...');

    this.loadNextFile(filtered);
  }

  loadNextFile(files: DataFile[]) {
    let headers = new HttpHeaders();
    headers = headers.set('Accept', 'application/json');
    headers = headers.set('Content-Type', 'application/json');
    let next = files.shift();
    if (next) {
      // if (next && !next.file.startsWith('http://') && next.file.startsWith('https://')) {
      // if (next.file.startsWith('https://')) {
      //   next = Object.assign({}, next);
      //   next.file = window.location.href + '/' + next.file;
      //   console.log('Adjusted file path: ' + next.file);
      // }
      // If the controller configuration file was loaded from a URL *and* the next file is a relative path,
      // then we need to adjust the path to be relative to where the controller configuration file was loaded from.
      if (this.configuration_file.startsWith('http') && !next.file.startsWith('http')) {
        // TODO There is probably a better way to do this.
        let base_url = this.configuration_file.substring(0, this.configuration_file.lastIndexOf('/'));
        next.file = base_url + '/' + next.file;
      }
      this.http.get(next.file).subscribe({
        next: data => {
          // console.log('Downloaded file: ' + next.file);
          // console.log(data);
          this.http.post(this.stack_configuration.fhir_base_url, data, { headers: headers }).subscribe({
            next: data => {
              this.toastrService.success(next.file, 'Loaded ' + next.name);
              this.messages.unshift({ type: 'primary', body: 'Loaded ' + next.file, date: new Date() });
              console.log('Loaded: ' + next.file);
              this.loadNextFile(files);
              // console.log(data);
            }, error: error => {
              this.toastrService.error( next.file, 'Error Loading');
              this.messages.unshift({ type: 'danger', body: 'Could not load ' + next.file, date: new Date() });
              console.error('Error loading file: ' + next.file);
              console.error(error);
              this.state = 'loaded';
            }
          });
        }, error: error => {
          this.toastrService.error( next.file, 'File Not Downloaded');
          this.messages.unshift({ type: 'danger', body: 'Could not download ' + next.file, date: new Date() });
          console.error('Error downloading file: ' + next.file);
          console.error(error);
          this.state = 'loaded';
        }
      });
    } else {
      this.messages.unshift({ type: 'info', body: 'Complete. Please check for errors. ', date: new Date() });
      this.state = 'loaded';
    }
  }

  toggleSelected() {
    this.files_to_load.forEach(f => {
      f.load = !f.load;
    });

  }

  resetServerData() {
    this.driver.reset().subscribe({
      next: data => {
        this.toastrService.success( 'Server reports that all data has been reset!', 'Expunge');
        this.messages.unshift({ type: 'primary', body: 'Server reset successful', date: new Date() });
        console.log('Expunge successful');
        console.log(data);
      }, error: error => {
        this.toastrService.error( 'The server return an error from the data reset attempt.', 'Error Expunging');
        this.messages.unshift({ type: 'danger', body: 'Error reseting data', date: new Date() });
        console.error('Error expunging');
        console.error(error);
      }
    });
  }

  test() {
    this.toastrService.success('Yay.', 'Test Message');
    this.messages.unshift({ type: 'info', body: 'It works.', date: new Date() });
  }

}
