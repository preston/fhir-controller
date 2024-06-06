// Author: Preston Lee
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component } from '@angular/core';

@Component({
  selector: 'app-loader',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './loader.component.html',
  styleUrl: './loader.component.scss'
})
export class LoaderComponent {

  patient_portal_url = (window as any)["PATIENT_PORTAL_BASE_URL"];
  provider_portal_url = (window as any)["PROVIDER_PORTAL_BASE_URL"];
  rules_url = (window as any)["RULES_BASE_URL"];
  cds_url = (window as any)["CDS_BASE_URL"];
  fhir_base_url = (window as any)["FHIR_BASE_URL"];

  files_prefix = '/data/';
  files = [
    'hospitalInformation1671557337568.json',
    'hospitalInformation1671557444542.json',
    'practitionerInformation1671557337568.json',
    'practitionerInformation1671557444542.json',
    'Patient 1 - Adrian Allen1 - R5-Initial view.json',
    'Patient 2 - Beth Brooks2 - R5-Initial view.json',
    'Patient 3 - Carmen Chavez - R5-Initial view.json',
    'Patient 4 - Diana Dixon4 - R5-Initial view.json',
    'Patient 5 - Emma Edwards5 - R5-Initial view.json',
    'Patient 8 - Hannah Hall8 - R5-Initial view.json',
    'Patient 9 - Ian Ingram9 - R5-Initial view.json',
    'Patient 10 - Justin Jordan10 - R5-Initial view.json',
    'Patient 11 - Kobe King11 - R5-Initial view.json',
    'Patient 12 - Lisa Little12 - R5-Initial view.json'
  ]
  loading: string[] = [];

  constructor(
    protected http: HttpClient
  ) { 
    this.reset();
  }

  reset() {
    this.loading = Object.assign([], this.files);
  }

  load() {
    this.loading = Object.assign([], this.files);
    this.loadNextFile(this.loading);
  }

  loadNextFile(files: string[]) {
    let headers = new HttpHeaders();
    headers = headers.set('Accept', 'application/json');
    headers = headers.set('Content-Type', 'application/json');
    let file = files.shift();
    this.http.get(this.files_prefix + file).subscribe({
      next: data => {
        console.log('Downloaded file: ' + file);
        // console.log(data);
        this.http.post(this.fhir_base_url, data, {headers: headers}).subscribe({
          next: data => {
            console.log('Loaded: ' + file);
            this.loadNextFile(files);
            // console.log(data);
          }, error: error => {
            console.error('Error loading file: ' + file);
            console.error(error);
          }
        });
      }, error: error => {
        console.error('Error downloading file: ' + file);
        console.error(error);
      }
    });
  }

}
