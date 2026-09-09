import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-reminder-skeleton',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reminder-skeleton.component.html',
  styleUrl: './reminder-skeleton.component.scss'
})
export class ReminderSkeletonComponent {
  @Input() count: number = 4;

  get skeletonArray(): number[] {
    return Array(this.count).fill(0);
  }
}
