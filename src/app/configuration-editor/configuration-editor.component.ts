import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

import { LoaderService } from '../loader/loader.service';
import { StackConfiguration } from '../loader/stack_configuration';
import { DataFile } from '../loader/data_file';
import { Link } from '../loader/link';
import { DriverType } from '../driver/driver_type';
import { LoaderType } from '../loader/loader_type';

@Component({
  selector: 'app-configuration-editor',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './configuration-editor.component.html',
  styleUrl: './configuration-editor.component.scss'
})
export class ConfigurationEditorComponent implements OnInit, OnDestroy {
  configurationForm: FormGroup | null = null;
  private subscription: Subscription = new Subscription();
  currentConfiguration: StackConfiguration | null = null;
  validationErrors: string[] = [];
  isNewConfiguration: boolean = false;
  hasUnsavedChanges: boolean = false;

  // Enums for template
  DriverType = DriverType;
  LoaderType = LoaderType;

  constructor(
    private loaderService: LoaderService,
    private formBuilder: FormBuilder,
    private toastrService: ToastrService
  ) {
    // Initialize form in ngOnInit to ensure proper timing
  }

  ngOnInit(): void {
    // Initialize the form first
    this.configurationForm = this.createForm();
    
    // Track form changes for unsaved changes detection
    this.subscription.add(
      this.configurationForm.valueChanges.subscribe(() => {
        this.hasUnsavedChanges = true;
      })
    );
    
    // Subscribe to configuration changes
    this.subscription.add(
      this.loaderService.configuration$.subscribe(config => {
        this.currentConfiguration = config;
        this.isNewConfiguration = false;
        this.hasUnsavedChanges = false;
        if (config) {
          this.populateForm(config);
        } else {
          // Initialize with empty form if no configuration
          this.clearFormArrays();
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private createForm(): FormGroup {
    return this.formBuilder.group({
      title: ['', [Validators.required, Validators.minLength(1)]],
      instructions: ['', [Validators.required]],
      fhir_base_url: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],
      driver: [DriverType.Generic, [Validators.required]],
      data: this.formBuilder.array([]),
      links: this.formBuilder.array([])
    });
  }

  private populateForm(config: StackConfiguration): void {
    if (!this.configurationForm) {
      this.configurationForm = this.createForm();
    }
    
    this.configurationForm.patchValue({
      title: config.title,
      instructions: config.instructions,
      fhir_base_url: config.fhir_base_url,
      driver: config.driver
    });

    // Clear existing arrays
    this.clearFormArrays();

    // Populate data files
    config.data.forEach(file => {
      this.addDataFile(file);
    });

    // Populate links
    config.links.forEach(link => {
      this.addLink(link);
    });

    // Reset unsaved changes flag when populating from existing config
    this.hasUnsavedChanges = false;
  }

  private clearFormArrays(): void {
    if (!this.configurationForm) {
      return;
    }
    
    const dataArray = this.configurationForm.get('data') as FormArray;
    const linksArray = this.configurationForm.get('links') as FormArray;
    
    while (dataArray.length !== 0) {
      dataArray.removeAt(0);
    }
    while (linksArray.length !== 0) {
      linksArray.removeAt(0);
    }
  }

  get dataFiles(): FormArray {
    if (!this.configurationForm) {
      return this.formBuilder.array([]);
    }
    return this.configurationForm.get('data') as FormArray;
  }

  get links(): FormArray {
    if (!this.configurationForm) {
      return this.formBuilder.array([]);
    }
    return this.configurationForm.get('links') as FormArray;
  }

  addDataFile(file?: DataFile): void {
    if (!this.configurationForm) {
      this.configurationForm = this.createForm();
    }

    const dataFileForm = this.formBuilder.group({
      file: [file?.file || '', [Validators.required]],
      load: [file?.load ?? true],
      loader: [file?.loader || LoaderType.FHIR_BUNDLE, [Validators.required]],
      name: [file?.name || '', [Validators.required]],
      description: [file?.description || '', [Validators.required]],
      type: [file?.type || '', [Validators.required]],
      priority: [file?.priority || 1, [Validators.required, Validators.min(1)]],
      evaluate: this.formBuilder.group({
        id: [file?.evaluate?.id || ''],
        subjects: this.formBuilder.array([])
      })
    });

    // Add subjects if they exist
    if (file?.evaluate?.subjects) {
      file.evaluate.subjects.forEach(subject => {
        this.addSubject(dataFileForm.get('evaluate') as FormGroup, subject);
      });
    }

    this.dataFiles.push(dataFileForm);
  }

  removeDataFile(index: number): void {
    this.dataFiles.removeAt(index);
  }

  addLink(link?: Link): void {
    if (!this.configurationForm) {
      this.configurationForm = this.createForm();
    }

    const linkForm = this.formBuilder.group({
      name: [link?.name || '', [Validators.required]],
      url: [link?.url || '', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]]
    });
    this.links.push(linkForm);
  }

  removeLink(index: number): void {
    this.links.removeAt(index);
  }

  addSubject(evaluateGroup: any, subject?: { id: string, name: string }): void {
    if (!evaluateGroup) {
      return;
    }
    const subjectsArray = evaluateGroup.get('subjects') as FormArray;
    if (!subjectsArray) {
      return;
    }
    const subjectForm = this.formBuilder.group({
      id: [subject?.id || '', [Validators.required]],
      name: [subject?.name || '', [Validators.required]]
    });
    subjectsArray.push(subjectForm);
  }

  removeSubject(evaluateGroup: any, index: number): void {
    if (!evaluateGroup) {
      return;
    }
    const subjectsArray = evaluateGroup.get('subjects') as FormArray;
    if (!subjectsArray) {
      return;
    }
    subjectsArray.removeAt(index);
  }

  getSubjectsArray(evaluateGroup: any): FormArray {
    if (!evaluateGroup) {
      return this.formBuilder.array([]);
    }
    const subjectsArray = evaluateGroup.get('subjects') as FormArray;
    return subjectsArray || this.formBuilder.array([]);
  }

  onDataFileLoaderChange(index: number): void {
    const dataFile = this.dataFiles.at(index);
    const loader = dataFile.get('loader')?.value;
    const evaluateGroup = dataFile.get('evaluate') as FormGroup;
    
    if (loader === LoaderType.CQL_AS_FHIR_LIBRARY) {
      // Ensure evaluate group has required fields
      if (!evaluateGroup.get('id')?.value) {
        evaluateGroup.get('id')?.setValue('');
      }
    }
  }

  validateConfiguration(): boolean {
    this.validationErrors = [];
    
    if (!this.configurationForm || this.configurationForm.invalid) {
      if (this.configurationForm) {
        this.markFormGroupTouched(this.configurationForm);
      }
      this.validationErrors.push('Please fix all form validation errors.');
      return false;
    }

    // Additional JSON schema validation
    const config = this.getConfigurationFromForm();
    
    // Validate required fields
    if (!config.title || config.title.trim() === '') {
      this.validationErrors.push('Title is required.');
    }
    
    if (!config.instructions || config.instructions.trim() === '') {
      this.validationErrors.push('Instructions are required.');
    }
    
    if (!config.fhir_base_url || !config.fhir_base_url.match(/^https?:\/\/.+/)) {
      this.validationErrors.push('FHIR Base URL must be a valid HTTP/HTTPS URL.');
    }
    
    if (!config.driver || !Object.values(DriverType).includes(config.driver)) {
      this.validationErrors.push('Driver must be one of: generic, hapi, wildfhir, fhircandle.');
    }
    
    if (!config.data || config.data.length === 0) {
      this.validationErrors.push('At least one data file is required.');
    }
    
    // Validate data files
    config.data.forEach((file, index) => {
      if (!file.file || file.file.trim() === '') {
        this.validationErrors.push(`Data file ${index + 1}: File path is required.`);
      }
      if (!file.name || file.name.trim() === '') {
        this.validationErrors.push(`Data file ${index + 1}: Name is required.`);
      }
      if (!file.description || file.description.trim() === '') {
        this.validationErrors.push(`Data file ${index + 1}: Description is required.`);
      }
      if (!file.type || file.type.trim() === '') {
        this.validationErrors.push(`Data file ${index + 1}: Type is required.`);
      }
      if (file.priority < 1) {
        this.validationErrors.push(`Data file ${index + 1}: Priority must be at least 1.`);
      }
      if (file.loader === LoaderType.CQL_AS_FHIR_LIBRARY && (!file.evaluate || !file.evaluate.id)) {
        this.validationErrors.push(`Data file ${index + 1}: CQL library requires evaluation ID.`);
      }
    });
    
    // Validate links
    config.links.forEach((link, index) => {
      if (!link.name || link.name.trim() === '') {
        this.validationErrors.push(`Link ${index + 1}: Name is required.`);
      }
      if (!link.url || !link.url.match(/^https?:\/\/.+/)) {
        this.validationErrors.push(`Link ${index + 1}: URL must be a valid HTTP/HTTPS URL.`);
      }
    });

    return this.validationErrors.length === 0;
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      } else if (control instanceof FormArray) {
        control.controls.forEach(arrayControl => {
          if (arrayControl instanceof FormGroup) {
            this.markFormGroupTouched(arrayControl);
          }
        });
      }
    });
  }

  saveConfiguration(): void {
    if (!this.validateConfiguration()) {
      this.toastrService.error('Please fix validation errors before applying.', 'Validation Error');
      return;
    }

    const config = this.getConfigurationFromForm();
    this.loaderService.configurationSubject.next(config);
    this.hasUnsavedChanges = false;
    
    if (this.isNewConfiguration) {
      this.isNewConfiguration = false;
      this.currentConfiguration = config;
      this.toastrService.success('New configuration created and applied successfully!', 'Success');
    } else {
      this.toastrService.success('Configuration updated and applied successfully!', 'Success');
    }
  }

  private getConfigurationFromForm(): StackConfiguration {
    if (!this.configurationForm) {
      return new StackConfiguration();
    }
    
    const formValue = this.configurationForm.value;
    const config = new StackConfiguration();
    
    config.title = formValue.title;
    config.instructions = formValue.instructions;
    config.fhir_base_url = formValue.fhir_base_url;
    config.driver = formValue.driver;
    
    config.data = formValue.data.map((fileData: any) => {
      const file = new DataFile();
      file.file = fileData.file;
      file.load = fileData.load;
      file.loader = fileData.loader;
      file.name = fileData.name;
      file.description = fileData.description;
      file.type = fileData.type;
      file.priority = fileData.priority;
      
      if (fileData.evaluate && fileData.evaluate.id) {
        file.evaluate = {
          id: fileData.evaluate.id,
          subjects: fileData.evaluate.subjects || []
        };
      }
      
      return file;
    });
    
    config.links = formValue.links.map((linkData: any) => {
      const link = new Link();
      link.name = linkData.name;
      link.url = linkData.url;
      return link;
    });
    
    return config;
  }

  downloadConfiguration(): void {
    if (!this.validateConfiguration()) {
      this.toastrService.error('Please fix validation errors before downloading.', 'Validation Error');
      return;
    }

    const config = this.getConfigurationFromForm();
    const jsonString = JSON.stringify(config, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'stack-configuration.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    this.toastrService.success('Configuration downloaded successfully!', 'Download Complete');
  }

  createNewConfiguration(): void {
    // Check for unsaved changes
    if (this.hasUnsavedChanges) {
      const confirmed = confirm('You have unsaved changes. Are you sure you want to create a new configuration? Your changes will be lost.');
      if (!confirmed) {
        return;
      }
    }

    // Reset to new configuration mode
    this.isNewConfiguration = true;
    this.currentConfiguration = null;
    this.hasUnsavedChanges = false;
    
    if (!this.configurationForm) {
      this.configurationForm = this.createForm();
    }
    
    // Reset form to default values
    this.configurationForm.reset({
      title: '',
      instructions: '',
      fhir_base_url: '',
      driver: DriverType.Generic
    });
    this.clearFormArrays();
    this.validationErrors = [];
    
    this.toastrService.info('Creating new configuration. Fill in the details below.', 'New Configuration');
  }

  resetForm(): void {
    if (!this.configurationForm) {
      this.configurationForm = this.createForm();
    }
    
    if (this.isNewConfiguration) {
      // Reset to empty new configuration
      this.configurationForm.reset({
        title: '',
        instructions: '',
        fhir_base_url: '',
        driver: DriverType.Generic
      });
      this.clearFormArrays();
    } else if (this.currentConfiguration) {
      // Reset to current configuration
      this.populateForm(this.currentConfiguration);
    } else {
      // Reset to empty form
      this.configurationForm.reset();
      this.clearFormArrays();
    }
    this.validationErrors = [];
    this.hasUnsavedChanges = false;
  }
}
