// Author: Preston Lee

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';

import { StackConfiguration } from './stack_configuration';
import { DataFile } from './data_file';
import { LoaderMessage } from './loader_message';
import { LoaderType } from './loader_type';
import { DriverType } from '../driver/driver_type';
import { GenericDriver } from '../driver/generic_driver';
import { HapiFhirDriver } from '../driver/hapi_driver';
import { WildFhirDriver } from '../driver/wildfhir_driver';
import { FhirCandleDriver } from '../driver/fhir_candle_driver';

@Injectable()
export class LoaderService {
  public configurationSubject = new BehaviorSubject<StackConfiguration | null>(null);
  private filesSubject = new BehaviorSubject<DataFile[]>([]);
  private messagesSubject = new BehaviorSubject<LoaderMessage[]>([]);
  private stateSubject = new BehaviorSubject<'default' | 'loading' | 'loaded'>('default');
  private errorsSubject = new BehaviorSubject<boolean>(false);

  public configuration$ = this.configurationSubject.asObservable();
  public files$ = this.filesSubject.asObservable();
  public messages$ = this.messagesSubject.asObservable();
  public state$ = this.stateSubject.asObservable();
  public errors$ = this.errorsSubject.asObservable();

  public driver: GenericDriver | HapiFhirDriver | WildFhirDriver | FhirCandleDriver | null = null;
  private configuration_file = 'stack.json';

  constructor(
    private http: HttpClient,
    private toastrService: ToastrService
  ) { }

  get currentConfiguration(): StackConfiguration | null {
    return this.configurationSubject.value;
  }

  get currentFiles(): DataFile[] {
    return this.filesSubject.value;
  }

  get currentMessages(): LoaderMessage[] {
    return this.messagesSubject.value;
  }

  get currentState(): 'default' | 'loading' | 'loaded' {
    return this.stateSubject.value;
  }

  get hasErrors(): boolean {
    return this.errorsSubject.value;
  }


  loadStackConfiguration(configurationFile?: string): Observable<StackConfiguration> {
    const file = configurationFile || this.configuration_file;

    return this.http.get<StackConfiguration>(file).pipe(
      tap(data => {
        this.loadStackConfigurationData(data);
        this.addMessage({ type: 'info', body: 'Controller configuration has been reloaded.', date: new Date() });
      }),
      catchError(error => {
        console.error('Error loading configuration file: ' + file);
        console.error(error);
        this.errorsSubject.next(true);
        this.addMessage({ type: 'danger', body: 'Error loading configuration file: ' + file, date: new Date() });
        this.toastrService.error('Could not load configuration file: ' + file, 'Error Loading Configuration');
        return throwError(() => error);
      })
    );
  }

  private loadStackConfigurationData(data: StackConfiguration): void {
    this.configurationSubject.next(data);
    const tmp: DataFile[] = JSON.parse(JSON.stringify(data.data));
    const sortedFiles = tmp.sort((a, b) => a.priority - b.priority);
    this.filesSubject.next(sortedFiles);
    this.stateSubject.next('default');
    this.changeDriver();
  }

  public changeDriver(): void {
    const config = this.currentConfiguration;
    if (!config) {
      this.driver = null;
      return;
    } else {
      switch (config.driver) {
        case DriverType.Hapi:
          this.driver = new HapiFhirDriver(config, this.http);
          console.log('Using HAPI driver.');
          break;
        case DriverType.WildFHIR:
          this.driver = new WildFhirDriver(config, this.http);
          console.log('Using WildFHIR driver.');
          break;
        case DriverType.FHIRCandle:
          this.driver = new FhirCandleDriver(config, this.http);
          console.log('Using FHIR Candle driver.');
          break;
        default:
          config.driver = DriverType.Generic;
          this.driver = new GenericDriver(config, this.http);
          console.log('Using generic driver.');
          break;
      }
    }
  }

  loadFiles(filesToLoad?: DataFile[]): void {
    this.stateSubject.next('loading');
    this.addMessage({ type: 'info', body: 'Starting load operations...', date: new Date() });

    const files = filesToLoad || this.currentFiles;
    const filtered = files.filter(f => f.load);
    console.log('Loading ' + filtered.length + ' files...');
    this.loadNextFile([...filtered]);
  }

  private loadNextFile(files: DataFile[]): void {
    const headers = new HttpHeaders()
      .set('Accept', 'application/json')
      .set('Content-Type', 'application/json');

    const next = files.shift();
    if (!next) {
      this.addMessage({ type: 'info', body: 'Complete. Please check for errors.', date: new Date() });
      this.stateSubject.next('loaded');
      return;
    }

    // Adjust file path if needed
    let filePath = next.file;
    if (this.configuration_file.startsWith('http') && !next.file.startsWith('http')) {
      const base_url = this.configuration_file.substring(0, this.configuration_file.lastIndexOf('/'));
      filePath = base_url + '/' + next.file;
    }

    this.http.get(filePath, { responseType: 'text' }).subscribe({
      next: data => {
        console.log('Loading file: ' + filePath + ' with loader type: ' + next.loader);
        this.processFileData(next, data, headers, files);
      },
      error: error => {
        this.toastrService.error(filePath, 'File Not Downloaded');
        this.addMessage({ type: 'danger', body: 'Could not download ' + filePath, date: new Date() });
        console.error('Error downloading file: ' + filePath);
        console.error(error);
        this.stateSubject.next('loaded');
      }
    });
  }

  private processFileData(file: DataFile, data: string, headers: HttpHeaders, remainingFiles: DataFile[]): void {
    const config = this.currentConfiguration;
    if (!config) return;

    switch (file.loader) {
      case LoaderType.CQL_AS_FHIR_LIBRARY:
        this.processCqlLibrary(file, data, headers, remainingFiles, config);
        break;
      case LoaderType.FHIR_BUNDLE:
      default:
        this.processFhirBundle(file, data, headers, remainingFiles, config);
        break;
    }
  }

  private processCqlLibrary(file: DataFile, data: string, headers: HttpHeaders, remainingFiles: DataFile[], config: StackConfiguration): void {
    const info = this.extractCqlLibraryNameAndVersion(data);
    if (info) {
      const description = file.description || 'CQL Library loaded from file: ' + file.file;
      const libraryResource = this.buildLibraryResource(info.libraryName, info.version, description, data, config);

      this.http.put(config.fhir_base_url + '/Library/' + info.libraryName, libraryResource, { headers }).subscribe({
        next: () => {
          this.toastrService.success(file.file, 'Loaded ' + file.name);
          this.addMessage({ type: 'success', body: 'Loaded ' + file.file, date: new Date() });
          console.log('Loaded: ' + file.file);
          this.loadNextFile(remainingFiles);
        },
        error: error => {
          this.toastrService.error(file.file, 'Error Loading CQL Library');
          this.addMessage({ type: 'danger', body: 'Could not load ' + file.file, date: new Date() });
          console.error('Error loading file: ' + file.file);
          console.error(error);
          this.stateSubject.next('loaded');
        }
      });
    } else {
      this.toastrService.error(file.file, 'Could not extract CQL library name and version');
      this.addMessage({ type: 'danger', body: 'Could not extract CQL library name and version from file: ' + file.file, date: new Date() });
      console.error('Could not extract CQL library name and version from file: ' + file.file);
      this.stateSubject.next('loaded');
    }
  }

  private processFhirBundle(file: DataFile, data: string, headers: HttpHeaders, remainingFiles: DataFile[], config: StackConfiguration): void {
    this.http.post(config.fhir_base_url, data, { headers }).subscribe({
      next: () => {
        this.toastrService.success(file.file, 'Loaded ' + file.name);
        this.addMessage({ type: 'success', body: 'Loaded ' + file.file, date: new Date() });
        console.log('Loaded: ' + file.file);
        this.loadNextFile(remainingFiles);
      },
      error: error => {
        this.toastrService.error(file.file, 'Error Loading FHIR Bundle');
        this.addMessage({ type: 'danger', body: 'Could not load ' + file.file, date: new Date() });
        console.error('Error loading file: ' + file.file);
        console.error(error);
        this.stateSubject.next('loaded');
      }
    });
  }

  private extractCqlLibraryNameAndVersion(content: string) {
    const libraryRegex = /^library\s+(\w+)\s+version\s+'([^']+)'/m;
    const match = content.match(libraryRegex);
    if (match) {
      const libraryName = match[1];
      const version = match[2];
      return { libraryName, version };
    } else {
      return null;
    }
  }

  private buildLibraryResource(libraryName: string, version: string, description: string, cql: string, config: StackConfiguration) {
    const encoded = btoa(cql);
    return {
      resourceType: 'Library',
      type: {},
      id: libraryName,
      version: version,
      name: libraryName,
      title: libraryName,
      status: 'active',
      description: description,
      url: `${config.fhir_base_url}/Library/${libraryName}`,
      content: [
        {
          contentType: 'text/cql',
          data: encoded,
        },
      ],
    };
  }

  resetServerData(): Observable<any> {
    if (!this.driver) {
      return throwError(() => new Error('No driver available'));
    }

    return this.driver.reset().pipe(
      tap(data => {
        this.toastrService.success('Server reports that all data has been reset!', 'Expunge');
        this.addMessage({ type: 'success', body: 'Server reset successful', date: new Date() });
        console.log('Expunge successful');
        console.log(data);
      }),
      catchError(error => {
        this.toastrService.error('The server return an error from the data reset attempt.', 'Error Expunging');
        this.addMessage({ type: 'danger', body: 'Error reseting data', date: new Date() });
        console.error('Error expunging');
        console.error(error);
        return throwError(() => error);
      })
    );
  }

  evaluateCql(file: DataFile, subject: string): Observable<any> {
    if (!subject) {
      this.toastrService.error('Please select a subject to evaluate the CQL against.', 'No Subject Selected');
      this.addMessage({ type: 'danger', body: 'No subject selected for evaluation.', date: new Date() });
      return throwError(() => new Error('No subject selected'));
    }

    if (!file.evaluate || !file.evaluate.id) {
      this.toastrService.error('The CQL file does not have an Library ID set.', 'No Library ID');
      this.addMessage({ type: 'danger', body: 'CQL file does not have an evaluation ID set.', date: new Date() });
      return throwError(() => new Error('No Library ID'));
    }

    const config = this.currentConfiguration;
    if (!config) {
      return throwError(() => new Error('No configuration available'));
    }

    const parameters = this.createEvaluateParameters(subject);
    const headers = new HttpHeaders({ 'Content-Type': 'application/fhir+json' });

    return this.http.post(config.fhir_base_url + '/Library/' + file.evaluate.id + '/$evaluate', parameters, { headers }).pipe(
      tap(data => {
        this.toastrService.success(`${subject}\n${data}`, 'CQL $evaluate Success');
        this.addMessage({ type: 'success', body: 'CQL $evaluate Success' + `\n${JSON.stringify(data, null, 2)}`, date: new Date() });
        console.log('CQL evaluation successful:', data);
      }),
      catchError(error => {
        this.toastrService.error('CQL evaluation failed for subject: ' + subject, 'CQL Evaluation Error');
        this.addMessage({ type: 'danger', body: 'CQL evaluation failed for subject: ' + subject, date: new Date() });
        console.error('CQL evaluation error:', error);
        return throwError(() => error);
      })
    );
  }

  private createEvaluateParameters(subject: string) {
    return {
      resourceType: 'Parameters',
      parameter: [
        {
          name: "subject",
          valueString: subject
        }
      ]
    };
  }

  addMessage(message: LoaderMessage): void {
    const currentMessages = this.currentMessages;
    this.messagesSubject.next([message, ...currentMessages]);
  }

  toggleAllFiles(): void {
    const files = this.currentFiles.map(f => ({ ...f, load: !f.load }));
    this.filesSubject.next(files);
  }

  updateFile(index: number, file: DataFile): void {
    const files = [...this.currentFiles];
    files[index] = file;
    this.filesSubject.next(files);
  }

  clearMessages(): void {
    this.messagesSubject.next([]);
  }
}
