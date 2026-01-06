// Author: Preston Lee

import { Component, OnInit, OnDestroy, inject, signal, computed, effect, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ToastrService } from 'ngx-toastr';
import { MarkdownModule } from 'ngx-markdown';

import { LoaderService } from '../loader/loader.service';
import { StackConfiguration } from '../loader/stack_configuration';
import { DataFile } from '../loader/data_file';
import { Link } from '../loader/link';
import { DriverType } from '../driver/driver_type';
import { LoaderType } from '../loader/loader_type';

@Component({
  selector: 'app-configuration-editor',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MarkdownModule],
  templateUrl: './configuration-editor.component.html',
  styleUrl: './configuration-editor.component.scss'
})
export class ConfigurationEditorComponent implements OnInit, OnDestroy {
  // Inject services using inject() function
  private loaderService = inject(LoaderService);
  private formBuilder = inject(FormBuilder);
  private toastrService = inject(ToastrService);
  private destroyRef = inject(DestroyRef);

  configurationForm: FormGroup | null = null;
  // Convert observable to signal - automatically handles cleanup
  currentConfiguration = toSignal(this.loaderService.configuration$, { initialValue: null as StackConfiguration | null });
  validationErrors = signal<string[]>([]);
  isNewConfiguration = signal<boolean>(false);
  hasUnsavedChanges = signal<boolean>(false);
  
  // Computed signals for derived state
  hasValidationErrors = computed(() => this.validationErrors().length > 0);
  
  // Drag and drop properties
  private draggedIndex: number | null = null;
  private draggedOverIndex: number | null = null;

  // Enums for template
  DriverType = DriverType;
  LoaderType = LoaderType;

  constructor() {
    // Use effect() to react to configuration changes
    effect(() => {
      const config = this.currentConfiguration();
      if (config !== undefined) {
        this.isNewConfiguration.set(false);
        this.hasUnsavedChanges.set(false);
        if (config) {
          // Use setTimeout to ensure form is initialized
          setTimeout(() => {
            if (this.configurationForm) {
              this.populateForm(config);
            }
          });
        } else {
          // Initialize with empty form if no configuration
          setTimeout(() => {
            if (this.configurationForm) {
              this.clearFormArrays();
            }
          });
        }
      }
    });
  }

  ngOnInit(): void {
    // Initialize the form first
    this.configurationForm = this.createForm();
    
    // Track form changes for unsaved changes detection
    // Form valueChanges can't use toSignal easily since form is created in ngOnInit
    this.configurationForm.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.hasUnsavedChanges.set(true);
      });
  }

  ngOnDestroy(): void {
    // No need to manually unsubscribe when using takeUntilDestroyed
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
    this.hasUnsavedChanges.set(false);
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
    const errors: string[] = [];
    
    if (!this.configurationForm || this.configurationForm.invalid) {
      if (this.configurationForm) {
        this.markFormGroupTouched(this.configurationForm);
      }
      errors.push('Please fix all form validation errors.');
      this.validationErrors.set(errors);
      return false;
    }

    // Additional JSON schema validation
    const config = this.getConfigurationFromForm();
    
    // Validate required fields
    if (!config.title || config.title.trim() === '') {
      errors.push('Title is required.');
    }
    
    if (!config.instructions || config.instructions.trim() === '') {
      errors.push('Instructions are required.');
    }
    
    if (!config.fhir_base_url || !config.fhir_base_url.match(/^https?:\/\/.+/)) {
      errors.push('FHIR Base URL must be a valid HTTP/HTTPS URL.');
    }
    
    if (!config.driver || !Object.values(DriverType).includes(config.driver)) {
      errors.push('Driver must be one of: generic, hapi, wildfhir, fhircandle.');
    }
    
    if (!config.data || config.data.length === 0) {
      errors.push('At least one data file is required.');
    }
    
    // Validate data files
    config.data.forEach((file, index) => {
      if (!file.file || file.file.trim() === '') {
        errors.push(`Data file ${index + 1}: File path is required.`);
      }
      if (!file.name || file.name.trim() === '') {
        errors.push(`Data file ${index + 1}: Name is required.`);
      }
      if (!file.description || file.description.trim() === '') {
        errors.push(`Data file ${index + 1}: Description is required.`);
      }
      if (!file.type || file.type.trim() === '') {
        errors.push(`Data file ${index + 1}: Type is required.`);
      }
      if (file.priority < 1) {
        errors.push(`Data file ${index + 1}: Priority must be at least 1.`);
      }
      if (file.loader === LoaderType.CQL_AS_FHIR_LIBRARY && (!file.evaluate || !file.evaluate.id)) {
        errors.push(`Data file ${index + 1}: CQL library requires evaluation ID.`);
      }
    });
    
    // Validate links
    config.links.forEach((link, index) => {
      if (!link.name || link.name.trim() === '') {
        errors.push(`Link ${index + 1}: Name is required.`);
      }
      if (!link.url || !link.url.match(/^https?:\/\/.+/)) {
        errors.push(`Link ${index + 1}: URL must be a valid HTTP/HTTPS URL.`);
      }
    });

    this.validationErrors.set(errors);
    return errors.length === 0;
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
    this.hasUnsavedChanges.set(false);
    
    if (this.isNewConfiguration()) {
      this.isNewConfiguration.set(false);
      // currentConfiguration is now managed by the observable via toSignal()
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
    if (this.hasUnsavedChanges()) {
      const confirmed = confirm('You have unsaved changes. Are you sure you want to create a new configuration? Your changes will be lost.');
      if (!confirmed) {
        return;
      }
    }

    // Reset to new configuration mode
    this.isNewConfiguration.set(true);
    // currentConfiguration is now managed by the observable via toSignal()
    this.hasUnsavedChanges.set(false);
    
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
    this.validationErrors.set([]);
    
    this.toastrService.info('Creating new configuration. Fill in the details below.', 'New Configuration');
  }

  // Drag and drop methods
  onDragStart(event: DragEvent, index: number): void {
    this.draggedIndex = index;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/html', '');
    }
    const target = event.currentTarget as HTMLElement;
    target?.classList.add('dragging');
  }

  onDragEnd(event: DragEvent): void {
    this.draggedIndex = null;
    this.draggedOverIndex = null;
    const target = event.currentTarget as HTMLElement;
    target?.classList.remove('dragging');
    // Remove all drag-over classes
    document.querySelectorAll('.draggable-item').forEach(item => {
      item.classList.remove('drag-over');
    });
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  onItemDragOver(event: DragEvent, index: number): void {
    event.preventDefault();
    if (this.draggedIndex !== null && this.draggedIndex !== index) {
      this.draggedOverIndex = index;
      const target = event.currentTarget as HTMLElement;
      target?.classList.add('drag-over');
    }
  }

  onItemDrop(event: DragEvent, dropIndex: number): void {
    event.preventDefault();
    const target = event.currentTarget as HTMLElement;
    target?.classList.remove('drag-over');
    
    if (this.draggedIndex !== null && this.draggedIndex !== dropIndex) {
      this.moveDataFile(this.draggedIndex, dropIndex);
    }
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
  }

  private moveDataFile(fromIndex: number, toIndex: number): void {
    const dataArray = this.dataFiles;
    const item = dataArray.at(fromIndex);
    
    // Remove the item from the original position
    dataArray.removeAt(fromIndex);
    
    // Insert it at the new position
    dataArray.insert(toIndex, item);
    
    this.hasUnsavedChanges.set(true);
    this.toastrService.info('Data file order updated', 'Reorder Complete');
  }

  // Sorting methods
  sortDataFiles(sortBy: 'priority' | 'name' | 'type'): void {
    const dataArray = this.dataFiles;
    const items = dataArray.controls.map((control, index) => ({
      control,
      index,
      value: control.value
    }));

    // Sort the items based on the selected criteria
    items.sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          return (a.value.priority || 0) - (b.value.priority || 0);
        case 'name':
          return (a.value.name || '').localeCompare(b.value.name || '');
        case 'type':
          return (a.value.type || '').localeCompare(b.value.type || '');
        default:
          return 0;
      }
    });

    // Clear the array and re-add items in sorted order
    while (dataArray.length !== 0) {
      dataArray.removeAt(0);
    }

    items.forEach(item => {
      dataArray.push(item.control);
    });

    this.hasUnsavedChanges.set(true);
    this.toastrService.info(`Data files sorted by ${sortBy}`, 'Sort Complete');
  }

  resetForm(): void {
    if (!this.configurationForm) {
      this.configurationForm = this.createForm();
    }
    
    if (this.isNewConfiguration()) {
      // Reset to empty new configuration
      this.configurationForm.reset({
        title: '',
        instructions: '',
        fhir_base_url: '',
        driver: DriverType.Generic
      });
      this.clearFormArrays();
    } else if (this.currentConfiguration()) {
      // Reset to current configuration
      this.populateForm(this.currentConfiguration()!);
    } else {
      // Reset to empty form
      this.configurationForm.reset();
      this.clearFormArrays();
    }
    this.validationErrors.set([]);
    this.hasUnsavedChanges.set(false);
  }
}
