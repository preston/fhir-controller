// Author: Preston Lee

import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { MomentModule } from 'ngx-moment';

import { DataFile } from './data_file';
import { LoaderMessage } from './loader_message';
import { ToastService } from '../toast/toast.service';

@Component({
  selector: 'loader',
  standalone: true,
  imports: [CommonModule, FormsModule, MomentModule],
  providers: [],
  templateUrl: './loader.component.html',
  styleUrl: './loader.component.scss'
})
export class LoaderComponent {

  name = (window as any)["STACK_CONTROLLER_NAME"] || 'Stack Controller';
  patient_portal_url = (window as any)["PATIENT_PORTAL_BASE_URL"];
  provider_portal_url = (window as any)["PROVIDER_PORTAL_BASE_URL"];
  rules_url = (window as any)["RULES_BASE_URL"];
  cds_url = (window as any)["CDS_BASE_URL"];
  fhir_base_url = (window as any)["FHIR_BASE_URL"];

  development: boolean = false;

  files_prefix = '/data/';

  default_files: DataFile[] = [
    { file: 'hospitalInformation1671557337568.json', load: true, name: 'Organization Bundle 1', description: 'Synthea-generated Organization records', type: 'Organization' },
    { file: 'hospitalInformation1671557444542.json', load: true, name: 'Organization Bundle 2', description: 'Synthea-generated Organization records', type: 'Organization' },
    { file: 'practitionerInformation1671557337568.json', load: true, name: 'Practioner Bundle 1', description: 'Synthea-generated Practitioner records', type: 'Practitioner' },
    { file: 'practitionerInformation1671557444542.json', load: true, name: 'Practioner Bundle2 ', description: 'Synthea-generated Practitioner records', type: 'Practitioner' },
    { file: 'Patient 1 - Adrian Allen1 - R5-Initial view.json', load: true, name: 'Patient 1 - Adrian Allen1', description: 'Deidentified patient record from SHARES study.', type: 'Patient' },
    { file: 'Patient 2 - Beth Brooks2 - R5-Initial view.json', load: true, name: 'Patient 2 - Beth Brooks2', description: 'Deidentified patient record from SHARES study.', type: 'Patient' },
    { file: 'Patient 3 - Carmen Chavez - R5-Initial view.json', load: true, name: 'Patient 3 - Carmen Chavez', description: 'Deidentified patient record from SHARES study.', type: 'Patient' },
    { file: 'Patient 4 - Diana Dixon4 - R5-Initial view.json', load: true, name: 'Patient 4 - Diana Dixon4', description: 'Deidentified patient record from SHARES study.', type: 'Patient' },
    { file: 'Patient 5 - Emma Edwards5 - R5-Initial view.json', load: true, name: 'Patient 5 - Emma Edwards5', description: 'Deidentified patient record from SHARES study.', type: 'Patient' },
    { file: 'Patient 8 - Hannah Hall8 - R5-Initial view.json', load: true, name: 'Patient 8 - Hannah Hall8', description: 'Deidentified patient record from SHARES study.', type: 'Patient' },
    { file: 'Patient 9 - Ian Ingram9 - R5-Initial view.json', load: true, name: 'Patient 9 - Ian Ingram9', description: 'Deidentified patient record from SHARES study.', type: 'Patient' },
    { file: 'Patient 10 - Justin Jordan10 - R5-Initial view.json', load: true, name: 'Patient 10 - Justin Jordan10', description: 'Deidentified patient record from SHARES study.', type: 'Patient' },
    { file: 'Patient 11 - Kobe King11 - R5-Initial view.json', load: true, name: 'Patient 11 - Kobe King11', description: 'Deidentified patient record from SHARES study.', type: 'Patient' },
    { file: 'Patient 12 - Lisa Little12 - R5-Initial view.json', load: true, name: 'Patient 12 - Lisa Little12', description: 'Deidentified patient record from SHARES study.', type: 'Patient' }
  ]
  files_to_load: DataFile[] = [];
  state: 'default' | 'loading' | 'loaded' = 'default';
  errors: boolean = false;

  messages: LoaderMessage[] = [];

  constructor(
    protected http: HttpClient,
    protected toastService: ToastService
  ) {
    this.reset();
  }

  reset() {
    this.files_to_load = JSON.parse(JSON.stringify(this.default_files));
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
      this.http.get(this.files_prefix + next.file).subscribe({
        next: data => {
          console.log('Downloaded file: ' + next.file);
          // console.log(data);
          this.http.post(this.fhir_base_url, data, { headers: headers }).subscribe({
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
    this.http.post(this.fhir_base_url + '/$expunge', data).subscribe({
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
