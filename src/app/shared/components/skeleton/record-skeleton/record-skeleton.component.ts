import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-record-skeleton',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './record-skeleton.component.html',
  styleUrl: './record-skeleton.component.scss'
})
export class RecordSkeletonComponent {
  @Input() count: number = 3;

  get skeletonArray(): number[] {
    return Array(this.count).fill(0);
  }
}
