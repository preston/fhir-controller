// Author: Preston Lee

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-usage-tutorial',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './usage-tutorial.component.html',
  styleUrl: './usage-tutorial.component.scss'
})
export class UsageTutorialComponent {
  constructor() {}
}
