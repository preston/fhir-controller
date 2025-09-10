// Author: Preston Lee

import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';

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
export class LoaderComponent implements OnInit, OnDestroy {

	evaluateSubject: string | null = null;
	selectedScenario: string = 'default';
	availableScenarios: Scenario[] = [];
	filteredFiles: DataFile[] = [];

	development: boolean = false;

	configuration_file = 'stack.json';

	
	// stack_configuration: StackConfiguration = new StackConfiguration();
	// driver: any = null;

	files_to_load: DataFile[] = [];
	state: 'default' | 'loading' | 'loaded' = 'default';
	errors: boolean = false;

	messages: LoaderMessage[] = [];

	private subscriptions: Subscription[] = [];

	constructor(
		protected route: ActivatedRoute,
		protected toastrService: ToastrService,
		protected loaderService: LoaderService
	) {
	}

	ngOnInit() {
		// Subscribe to service observables
		this.subscriptions.push(
			this.loaderService.configuration$.subscribe(config => {
				if (config) {
					this.updateAvailableScenarios();
					this.updateFilteredFiles();
				}
			})
		);

		this.subscriptions.push(
			this.loaderService.files$.subscribe(files => {
				this.files_to_load = files;
				this.updateFilteredFiles();
			})
		);

		this.subscriptions.push(
			this.loaderService.messages$.subscribe(messages => {
				this.messages = messages;
			})
		);

		this.subscriptions.push(
			this.loaderService.state$.subscribe(state => {
				this.state = state;
			})
		);

		this.subscriptions.push(
			this.loaderService.errors$.subscribe(errors => {
				this.errors = errors;
			})
		);

		// Initialize scenarios and filtered files
		this.updateAvailableScenarios();
		this.updateFilteredFiles();
	}

	ngOnDestroy() {
		this.subscriptions.forEach(sub => sub.unsubscribe());
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
		this.loaderService.loadStackConfiguration().subscribe({
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
		this.loaderService.loadFiles();
	}

	toggleSelected() {
		this.loaderService.toggleAllFiles();
	}

	resetServerData() {
		this.loaderService.resetServerData().subscribe({
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

		this.loaderService.evaluateCql(file, this.evaluateSubject).subscribe({
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
			this.filteredFiles = this.files_to_load.filter(file => 
				!file.scenarios || file.scenarios.length === 0 || file.scenarios.includes('default')
			);
		} else {
			// Include only files that reference the selected scenario
			this.filteredFiles = this.files_to_load.filter(file => 
				file.scenarios && file.scenarios.includes(this.selectedScenario)
			);
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