// Author: Preston Lee

import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';

import { MomentModule } from 'ngx-moment';
import { MarkdownComponent } from 'ngx-markdown';
import { ToastrService } from 'ngx-toastr';

import { DataFile } from './data_file';
import { LoaderMessage } from './loader_message';
import { StackConfiguration } from './stack_configuration';
import { LoaderType } from './loader_type';
import { DriverType } from '../driver/driver_type';
import { LoaderService } from './loader.service';
import { Scenario } from './scenario';

@Component({
	selector: 'loader',
	standalone: true,
	imports: [CommonModule, FormsModule, MomentModule, MarkdownComponent],
	providers: [],
	templateUrl: './loader.component.html',
	styleUrl: './loader.component.scss'
})
export class LoaderComponent implements OnInit {
	// Inject services using inject() function
	protected route = inject(ActivatedRoute);
	protected toastrService = inject(ToastrService);
	protected loaderService = inject(LoaderService);

	evaluateSubject: string | null = null;
	selectedScenario: string = 'default';
	availableScenarios: Scenario[] = [];
	filteredFiles = signal<DataFile[]>([]);

	development: boolean = false;

	configuration_file = 'stack.json';

	// Convert observables to signals using toSignal() - automatically handles cleanup
	files_to_load = toSignal(this.loaderService.files$, { initialValue: [] });
	state = toSignal(this.loaderService.state$, { initialValue: 'default' as const });
	errors = toSignal(this.loaderService.errors$, { initialValue: false });
	messages = toSignal(this.loaderService.messages$, { initialValue: [] });

	constructor() {
		// Use effect() to react to configuration changes
		effect(() => {
			const config = this.loaderService.currentConfiguration;
			if (config) {
				this.updateAvailableScenarios();
				this.updateFilteredFiles();
			}
		});

		// Use effect() to react to files changes
		effect(() => {
			// Access the signal to trigger the effect
			const files = this.files_to_load();
			this.updateFilteredFiles();
		});
	}

	ngOnInit() {
		// Initialize scenarios and filtered files
		this.updateAvailableScenarios();
		this.updateFilteredFiles();
	}


	changeDriver() {
		// Driver changes are now handled by the service
		// This method is kept for template compatibility
	}

	get selectedDriver(): string {
		return this.loaderService.currentConfiguration?.driver || DriverType.Generic;
	}

	set selectedDriver(value: string) {
		if (this.loaderService.currentConfiguration) {
			this.loaderService.currentConfiguration.driver = value as DriverType;
			this.loaderService.changeDriver();
		}
	}

	get fhirBaseUrl(): string {
		return this.loaderService.currentConfiguration?.fhir_base_url || '';
	}

	set fhirBaseUrl(value: string) {
		if (this.loaderService.currentConfiguration) {
			this.loaderService.currentConfiguration.fhir_base_url = value;
		}
	}

	driverTypes() {
		return DriverType;
	}

	reloadStackConfiguration() {
		// HTTP observables complete automatically after one emission - no cleanup needed
		this.loaderService.loadStackConfiguration()
			.subscribe({
				next: () => {
					// Configuration loaded successfully
				},
				error: (error) => {
					console.error('Error loading configuration file: ' + this.configuration_file);
					console.error(error);
				}
			});
	}

	loaderTypes() {
		return LoaderType;
	}

	load() {
		this.loaderService.loadFiles(this.filteredFiles());
	}

	toggleSelected() {
		this.loaderService.toggleAllFiles();
	}

	resetServerData() {
		// HTTP observables complete automatically after one emission - no cleanup needed
		this.loaderService.resetServerData()
			.subscribe({
				next: (data) => {
					// Reset successful - handled by service
				},
				error: (error) => {
					// Error handled by service
				}
			});
	}

	test() {
		this.toastrService.success('Yay.', 'Test Message');
		this.loaderService.addMessage({ type: 'info', body: 'It works.', date: new Date() });
	}

	evaluateCql(file: DataFile) {
		if (!this.evaluateSubject) {
			this.toastrService.error('Please select a subject to evaluate the CQL against.', 'No Subject Selected');
			return;
		}

		// HTTP observables complete automatically after one emission - no cleanup needed
		this.loaderService.evaluateCql(file, this.evaluateSubject)
			.subscribe({
				next: (data) => {
					// Evaluation successful - handled by service
				},
				error: (error) => {
					// Error handled by service
				}
			});
	}

	private updateAvailableScenarios() {
		const scenarios = this.loaderService.currentConfiguration?.scenarios || [];
		// Always include a default scenario
		const defaultScenario: Scenario = {
			id: 'default',
			name: 'Default',
			description: 'All files without specific scenario assignments'
		};
		this.availableScenarios = [defaultScenario, ...scenarios];
	}

	private updateFilteredFiles() {
		if (this.selectedScenario === 'default') {
			// Include files with no scenarios or files that explicitly reference 'default'
			this.filteredFiles.set(this.files_to_load().filter(file => 
				!file.scenarios || file.scenarios.length === 0 || file.scenarios.includes('default')
			));
		} else {
			// Include only files that reference the selected scenario
			this.filteredFiles.set(this.files_to_load().filter(file => 
				file.scenarios && file.scenarios.includes(this.selectedScenario)
			));
		}
	}

	onScenarioChange() {
		this.updateFilteredFiles();
	}

	get selectedScenarioDescription(): string {
		const scenario = this.availableScenarios.find(s => s.id === this.selectedScenario);
		return scenario ? scenario.description : '';
	}
}