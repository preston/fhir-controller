// Author: Preston Lee

import { Component, OnChanges, SimpleChanges, inject, signal, computed, DestroyRef } from '@angular/core';
import { Library, Bundle, Patient, Parameters } from 'fhir/r4';
import { LibraryService } from '../library.service';
import { PatientService } from '../patient.service';
import { ToastrService } from 'ngx-toastr';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Highlight } from 'ngx-highlightjs';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
	selector: 'logic-component',
	imports: [FormsModule, CommonModule, Highlight],
	templateUrl: 'library.component.html',
	styleUrl: 'library.component.scss'
})
export class LibraryComponent implements OnChanges {
	// Inject services using inject() function
	protected libraryService = inject(LibraryService);
	protected patientService = inject(PatientService);
	protected toastrService = inject(ToastrService);
	private destroyRef = inject(DestroyRef);

	public library = signal<Library | null>(null);

	protected cql: string | null = null;
	public static DEFAULT_LIBRARY_NAME: string = '';
	public static DEFAULT_LIBRARY_VERSION = "0.0.0";
	public libraryVersion: string = LibraryComponent.DEFAULT_LIBRARY_VERSION;
	public libraryDescription: string = "";

	// Search functionality
	public searchTerm = signal<string>("");
	public searchResults = signal<Library[]>([]);
	public isSearching = signal<boolean>(false);
	public showSearchResults = signal<boolean>(false);
	private searchSubject = new Subject<string>();

	// Patient search functionality
	public patientSearchTerm = signal<string>("");
	public patientSearchResults = signal<Patient[]>([]);
	public isSearchingPatients = signal<boolean>(false);
	public showPatientSearchResults = signal<boolean>(false);
	private patientSearchSubject = new Subject<string>();

	// Library state tracking
	public isNewLibrary = signal<boolean>(false);
	public hasSelectedLibrary = signal<boolean>(false);

	// Patient state tracking
	public hasSelectedPatient = signal<boolean>(false);

	// Evaluation results
	public evaluationResults = signal<Parameters | null>(null);
	public isEvaluating = signal<boolean>(false);

	// Computed signals
	public canEvaluate = computed(() => this.hasSelectedLibrary() && this.hasSelectedPatient() && !this.isNewLibrary());
	public canShowEvaluationUI = computed(() => this.hasSelectedLibrary() && this.hasSelectedPatient());

	constructor() {
		// this.libraryService.libraryId = LibraryService.DEFAULT_LIBRARY_ID;
		console.log('LibraryComponent initialized');
		// this.reloadLibraryFromServer();
		// this.reloadExampleCql();

		// Set up live search with debouncing using takeUntilDestroyed
		this.searchSubject.pipe(
			debounceTime(100), // Wait 100ms after user stops typing
			distinctUntilChanged(), // Only emit if the value has changed
			switchMap(searchTerm => {
				if (searchTerm.trim()) {
					this.isSearching.set(true);
					return this.libraryService.search(searchTerm);
				} else {
					this.isSearching.set(false);
					this.showSearchResults.set(false);
					this.searchResults.set([]);
					return of<Bundle<Library>>({ resourceType: 'Bundle', type: 'searchset', entry: [] });
				}
			}),
			takeUntilDestroyed(this.destroyRef)
		).subscribe({
			next: (bundle: Bundle<Library> | null) => {
				if (!bundle) return;
				this.isSearching.set(false);
				if (bundle.entry && bundle.entry.length > 0) {
					this.searchResults.set(bundle.entry.map(entry => entry.resource!));
					this.showSearchResults.set(true);
				} else if (this.searchTerm().trim()) {
					this.searchResults.set([]);
					this.showSearchResults.set(true);
				}
			},
			error: (error: any) => {
				this.isSearching.set(false);
				console.error('Error searching libraries:', error);
				this.toastrService.error('Failed to search libraries. Please check your connection.', 'Search Error');
			}
		});

		// Set up patient search with debouncing using takeUntilDestroyed
		this.patientSearchSubject.pipe(
			debounceTime(100), // Wait 100ms after user stops typing
			distinctUntilChanged(), // Only emit if the value has changed
			switchMap(searchTerm => {
				if (searchTerm.trim()) {
					this.isSearchingPatients.set(true);
					return this.patientService.search(searchTerm);
				} else {
					this.isSearchingPatients.set(false);
					this.showPatientSearchResults.set(false);
					this.patientSearchResults.set([]);
					return of<Bundle<Patient>>({ resourceType: 'Bundle', type: 'searchset', entry: [] });
				}
			}),
			takeUntilDestroyed(this.destroyRef)
		).subscribe({
			next: (bundle: Bundle<Patient> | null) => {
				if (!bundle) return;
				this.isSearchingPatients.set(false);
				if (bundle.entry && bundle.entry.length > 0) {
					this.patientSearchResults.set(bundle.entry.map(entry => entry.resource!));
					this.showPatientSearchResults.set(true);
				} else if (this.patientSearchTerm().trim()) {
					this.patientSearchResults.set([]);
					this.showPatientSearchResults.set(true);
				}
			},
			error: (error: any) => {
				this.isSearchingPatients.set(false);
				console.error('Error searching patients:', error);
				this.toastrService.error('Failed to search patients. Please check your connection.', 'Patient Search Error');
			}
		});
	}

	ngOnChanges(changes: SimpleChanges) {
		console.log('Changes detected:', changes);
	}

	libraryAsString(): string {
		let s = '';
		const library = this.library();
		if (library) {
			// Create a copy of the library object with current form values
			const libraryCopy = { ...library };
			libraryCopy.id = this.libraryService.libraryId || '';
			libraryCopy.name = this.libraryService.libraryId || '';
			libraryCopy.title = this.libraryService.libraryId || '';
			libraryCopy.version = this.libraryVersion || '';
			libraryCopy.description = this.libraryDescription || '';
			libraryCopy.url = this.libraryService.urlFor(this.libraryService.libraryId || '');
			
			// Update content if CQL is present
			if (this.cql && this.cql.trim()) {
				libraryCopy.content = [{
					contentType: 'text/cql',
					data: btoa(this.cql)
				}];
			} else {
				libraryCopy.content = [];
			}
			
			s = JSON.stringify(libraryCopy, null, 2);
		}
		return s;
	}

	decodeLibaryData() {
		const library = this.library();
		if (library?.name) {
			this.libraryService.libraryId = library.name;
		} else {
			this.libraryService.libraryId = LibraryComponent.DEFAULT_LIBRARY_NAME;
		}
		if (library?.version) {
			this.libraryVersion = library.version;
		} else {
			this.libraryVersion = LibraryComponent.DEFAULT_LIBRARY_VERSION;
		}
		if (library?.description) {
			this.libraryDescription = library.description;
		} else {
			this.libraryDescription = `Logic Library for ${this.libraryService.libraryId}`;
		}
		if (library && library.content) {
			for (const content of library.content) {
				if (content.contentType === 'text/cql' && content.data) {
					try {
						this.cql = atob(content.data); // Decode base64 encoded CQL
					} catch (e) {
						console.error('Error decoding CQL:', e);
						this.toastrService.error('Failed to decode CQL content.', 'CQL Decoding Error');
					}
				}
			}
		}
	}


	reloadLibraryFromServer() {
		// HTTP observables complete automatically after one emission - no cleanup needed
		this.libraryService.get(this.libraryService.libraryId).subscribe({
			next: (library: Library) => {
				this.library.set(library);
				this.decodeLibaryData();
				console.log('Library loaded:', library);
				this.toastrService.success(`Library "${this.libraryService.libraryId}" loaded from server!`, 'Library Loaded');
			}, error: (error: any) => {
				this.library.set(null);
				console.error('Error loading library:', error);
				this.toastrService.error(`The server didn't respond with library for "${this.libraryService.libraryId}". It likely doesn't exist, in which case you should upload one. :)`, 'Logic Library Not Loaded');
			}
		});
	}

	// reloadExampleCql() {
	// 	this.libraryService.getExampleCql(this.exampleCqlFileUrl).subscribe({
	// 		next: (cql: string) => {
	// 			this.cql = cql;
	// 			let v = this.extractVersionFromCql(cql);
	// 			if (v) {
	// 				this.libraryVersion = v;
	// 				console.log('Extracted version from CQL:', this.libraryVersion);
	// 				this.toastrService.success(`CQL loaded to editor has not been saved to the server.`, 'Example Loaded into Editor');
	// 			} else {
	// 				this.libraryVersion = LibraryComponent.DEFAULT_LIBRARY_VERSION;
	// 				console.warn('No version found in CQL, using default version:', LibraryComponent.DEFAULT_LIBRARY_VERSION);
	// 				this.toastrService.warning(`Using default version "${LibraryComponent.DEFAULT_LIBRARY_VERSION}". CQL has not been saved to the server.`, 'Example Loaded into Editor');
	// 			}
	// 		}, error: (error: any) => {
	// 			console.error('Error loading example CQL:', error);
	// 			this.toastrService.error(`The server didn't respond with example CQL for "${this.exampleCqlFileUrl}". Please check the URL.`, 'Example CQL Not Loaded');
	// 			this.cql = null;
	// 		}
	// 	});
	// }

	extractVersionFromCql(cql: string): string | null {
		// const versionRegex = /^library.+version\s+\'(.*)\'$/
		const versionRegex = /library.*version\s+['"]([^'"]+)['"]/; // Match version in single or double quotes
		const match = cql.match(versionRegex);
		let version = null;
		if (match?.length && match.length >= 2) {
			version = match[1];
		}
		return version;
	}

	saveCql() {
		if (this.cql) {
			let bundle = this.buildFHIRBundle(
				this.libraryService.libraryId,
				this.libraryVersion,
				this.libraryDescription,
				this.cql);
			// HTTP observables complete automatically after one emission - no cleanup needed
			this.libraryService.put(bundle).subscribe({
				next: (response: any) => {
					console.log('Library saved successfully:', response);
					this.toastrService.success(`Library "${this.libraryService.libraryId}" saved successfully!`, 'Library Saved to Server');
					this.library.set(response); // Update the local library reference
					this.isNewLibrary.set(false); // After saving, it's no longer a new library
					// this.reloadLibrary();
				}, error: (error: any) => {
					console.error('Error saving library:', error);
					this.toastrService.error(`Failed to save library "${this.libraryService.libraryId}". Please check the server logs for more details.`, 'Library Save Failed');
				}
			});
		}
	}

	deleteCql() {
		const library = this.library();
		if (library) {
			// HTTP observables complete automatically after one emission - no cleanup needed
			this.libraryService.delete(library).subscribe({
				next: (response: any) => {
					console.log('Library deleted successfully:', response);
					this.toastrService.success(`Library "${this.libraryService.libraryId}" deleted successfully!`, 'Library Deleted');
					this.library.set(null); // Clear the local library reference
					this.hasSelectedLibrary.set(false); // Reset selection state
					this.isNewLibrary.set(false); // Reset new library state
					this.decodeLibaryData(); // Reset the decoded data to defaults
				}, error: (error: any) => {
					console.error('Error deleting library:', error);
					this.toastrService.error(`Failed to delete library "${this.libraryService.libraryId}". Please check the server logs for more details.`, 'Library Delete Failed');
				}
			});
		} else {
			this.toastrService.error('No library ID set. Please provide a valid library ID before deleting.', 'Library Delete Error');
		}
	}

	buildFHIRBundle(libraryName: string, version: string, description: string, cql: string) {
		let encoded = btoa(cql); // Ensure cql is base64 encoded
		const libraryResource: Library = {
			resourceType: 'Library',
			type: {},
			id: libraryName,
			version: version,
			name: libraryName,
			title: libraryName,
			status: 'active',
			description: description,
			url: this.libraryService.urlFor(libraryName),
			content: [
				{
					contentType: 'text/cql',
					data: encoded, // Use base64 encoded CQL
				},
			],
		};
		return libraryResource;
	}

	// Search functionality methods
	onSearchInput(event: any) {
		const searchTerm = event.target.value;
		this.searchTerm.set(searchTerm);
		this.searchSubject.next(searchTerm);
	}

	selectLibrary(library: Library) {
		if (library.id) {
			this.libraryService.libraryId = library.id;
			this.showSearchResults.set(false);
			this.searchTerm.set("");
			this.searchResults.set([]);
			
			// Set state for existing library
			this.isNewLibrary.set(false);
			this.hasSelectedLibrary.set(true);
			
			// Set the library object immediately for the FHIR Resource tab
			this.library.set(library);
			
			this.reloadLibraryFromServer();
			this.toastrService.success(`Selected library: ${library.name || library.id}`, 'Library Selected');
		}
	}

	clearSearch() {
		this.searchTerm.set("");
		this.searchResults.set([]);
		this.showSearchResults.set(false);
		this.isSearching.set(false);
		this.searchSubject.next(""); // Clear any pending searches
	}

	createNewLibrary() {
		// Reset to defaults for a new library
		this.libraryService.libraryId = "";
		this.libraryVersion = LibraryComponent.DEFAULT_LIBRARY_VERSION;
		this.libraryDescription = "";
		this.cql = "";
		
		// Create a basic Library object for the FHIR Resource tab
		this.library.set({
			resourceType: 'Library',
			type: {},
			id: '',
			version: this.libraryVersion,
			name: '',
			title: '',
			status: 'draft',
			description: this.libraryDescription,
			url: '',
			content: []
		});
		
		// Set state for new library
		this.isNewLibrary.set(true);
		this.hasSelectedLibrary.set(true);
		
		// Clear search state
		this.clearSearch();
		
		this.toastrService.info("Creating new library. Fill in the details below.", "New Library");
	}

	clearSelection() {
		// Reset all state
		this.library.set(null);
		this.libraryService.libraryId = "";
		this.libraryVersion = LibraryComponent.DEFAULT_LIBRARY_VERSION;
		this.libraryDescription = "";
		this.cql = "";
		this.isNewLibrary.set(false);
		this.hasSelectedLibrary.set(false);
		
		// Clear search state
		this.clearSearch();
		
		this.toastrService.info("Cleared selection. You can now search for existing libraries or create a new one.", "Selection Cleared");
	}

	/**
	 * Check if all required form fields are filled
	 */
	isFormValid(): boolean {
		return !!(
			this.libraryService.libraryId?.trim() &&
			this.libraryVersion?.trim() &&
			this.libraryDescription?.trim() &&
			this.cql?.trim()
		);
	}

	// Patient search functionality methods
	onPatientSearchInput(event: any) {
		const searchTerm = event.target.value;
		this.patientSearchTerm.set(searchTerm);
		this.patientSearchSubject.next(searchTerm);
	}

	selectPatient(patient: Patient) {
		if (patient.id) {
			this.patientService.selectedPatient = patient;
			this.showPatientSearchResults.set(false);
			this.patientSearchTerm.set("");
			this.patientSearchResults.set([]);
			this.hasSelectedPatient.set(true);
			this.toastrService.success(`Selected patient: ${this.getPatientDisplayName(patient)}`, 'Patient Selected');
		}
	}

	clearPatientSearch() {
		this.patientSearchTerm.set("");
		this.patientSearchResults.set([]);
		this.showPatientSearchResults.set(false);
		this.isSearchingPatients.set(false);
		this.patientSearchSubject.next(""); // Clear any pending searches
	}

	clearPatientSelection() {
		this.patientService.clearSelection();
		this.hasSelectedPatient.set(false);
		this.clearPatientSearch();
		this.evaluationResults.set(null); // Clear evaluation results when patient is cleared
		this.toastrService.info("Patient selection cleared.", "Patient Cleared");
	}

	getPatientDisplayName(patient: Patient): string {
		if (patient.name && patient.name.length > 0) {
			const name = patient.name[0];
			const given = name.given ? name.given.join(' ') : '';
			const family = name.family || '';
			return `${given} ${family}`.trim() || patient.id || 'Unknown';
		}
		return patient.id || 'Unknown';
	}

	evaluateLibrary() {
		if (!this.canEvaluate()) {
			this.toastrService.error('Please select both a library and a patient before evaluating.', 'Evaluation Error');
			return;
		}

		if (!this.libraryService.libraryId || !this.patientService.selectedPatient?.id) {
			this.toastrService.error('Missing library ID or patient ID for evaluation.', 'Evaluation Error');
			return;
		}

		this.isEvaluating.set(true);
		this.evaluationResults.set(null);

		// Create parameters for evaluation with patient context
		const parameters: Parameters = {
			resourceType: 'Parameters',
			parameter: [
				{
					name: 'subject',
					valueString: `Patient/${this.patientService.selectedPatient.id}`
				}
			]
		};

		// HTTP observables complete automatically after one emission - no cleanup needed
		this.libraryService.evaluate(
			this.libraryService.libraryId,
			parameters
		).subscribe({
			next: (results: Parameters) => {
				this.isEvaluating.set(false);
				this.evaluationResults.set(results);
				this.toastrService.success('Library evaluation completed successfully!', 'Evaluation Complete');
			},
			error: (error: any) => {
				this.isEvaluating.set(false);
				console.error('Error evaluating library:', error);
				this.toastrService.error('Failed to evaluate library. Please check the server logs for more details.', 'Evaluation Failed');
			}
		});
	}

	evaluationResultsAsString(): string {
		const results = this.evaluationResults();
		return results ? JSON.stringify(results, null, 2) : '';
	}

}