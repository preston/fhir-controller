// Author: Preston Lee

import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { MomentModule } from 'ngx-moment';

import { DataFile } from './data_file';
import { LoaderMessage } from './loader_message';
import { ToastService } from '../toast/toast.service';
import { StackConfiguration } from './stack_configuration';
import { MarkdownComponent } from 'ngx-markdown';
import { ActivatedRoute } from '@angular/router';

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

  stack_configuration: StackConfiguration = new StackConfiguration();

  // default_files: DataFile[] = [
  // ]

  files_to_load: DataFile[] = [];
  state: 'default' | 'loading' | 'loaded' = 'default';
  errors: boolean = false;

  messages: LoaderMessage[] = [];

  constructor(
    protected http: HttpClient,
    protected route: ActivatedRoute,
    protected toastService: ToastService
  ) {
  }

  reset() {
    this.http.get<StackConfiguration>(this.configuration_file).subscribe({
      next: data => {
        this.loadStackConfiguration(data);
      }, error: error => {
        console.error('Error loading configuration file: ' + this.configuration_file);
        console.error(error);
        this.errors = true;
        this.messages.unshift({ type: 'danger', body: 'Error loading configuration file: ' + this.configuration_file, date: new Date() });
        this.toastService.showErrorToast('Error Loading Configuration', 'Could not load configuration file: ' + this.configuration_file);
      }
    });

  }

  ngOnInit() {
    let url = this.route.queryParams.subscribe({
      next: (params) => {
        let url = params["url"];
        if (url) {
          console.log('Loading from URL: ' + url);
          
          this.http.get<StackConfiguration>(url).subscribe({
            next: (data => {
              this.loadStackConfiguration(data);
            }),
            error: (e => {
              this.toastService.showWarningToast("Couldn't load URL", "The remote file URL couldn't be loaded, sorry. Check the URL and your connectivity and try again.");
            })
          });
        } else {
          console.log('No URL provided. Loading for default configuration file.');          
          this.reset();
        }
      }
    }
    );

  }

  loadStackConfiguration(data: StackConfiguration) {
    this.stack_configuration = data;
    this.files_to_load = JSON.parse(JSON.stringify(this.stack_configuration.data));
    this.state = 'default';
    this.messages.unshift({ type: 'info', body: 'Controller has been reset.', date: new Date() });
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
      this.http.get(next.file).subscribe({
        next: data => {
          console.log('Downloaded file: ' + next.file);
          // console.log(data);
          this.http.post(this.stack_configuration.fhir_base_url, data, { headers: headers }).subscribe({
            next: data => {
              this.toastService.showSuccessToast('Loaded ' + next.name, next.file);
              this.messages.unshift({ type: 'primary', body: 'Loaded ' + next.file, date: new Date() });
              console.log('Loaded: ' + next.file);
              this.loadNextFile(files);
              // console.log(data);
            }, error: error => {
              this.toastService.showErrorToast('Error Loading', next.file);
              this.messages.unshift({ type: 'danger', body: 'Could not load ' + next.file, date: new Date() });
              console.error('Error loading file: ' + next.file);
              console.error(error);
            }
          });
        }, error: error => {
          this.toastService.showErrorToast('File Not Downloaded', next.file);
          this.messages.unshift({ type: 'danger', body: 'Could not download ' + next.file, date: new Date() });
          console.error('Error downloading file: ' + next.file);
          console.error(error);
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

  expunge() {
    let data = {
      "resourceType": "Parameters",
      "parameter": [
        {
          "name": "expungeEverything",
          "valueBoolean": true
        }
      ]
    }
    this.http.post(this.stack_configuration.fhir_base_url + '/$expunge', data).subscribe({
      next: data => {
        this.toastService.showSuccessToast('Expunge', 'Server reports that all data has been expunged!');
        this.messages.unshift({ type: 'primary', body: 'Expunge successful', date: new Date() });
        console.log('Expunge successful');
        console.log(data);
      }, error: error => {
        this.toastService.showErrorToast('Error Expunging', 'The server return an error from the expunge operation');
        this.messages.unshift({ type: 'danger', body: 'Error expunging', date: new Date() });
        console.error('Error expunging');
        console.error(error);
      }
    });
  }
  test() {
    this.toastService.showSuccessToast('Test Message', 'Yay.');
    this.messages.unshift({ type: 'info', body: 'It works.', date: new Date() });
  }

}
