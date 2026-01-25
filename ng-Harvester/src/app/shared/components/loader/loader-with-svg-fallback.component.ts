import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoaderService } from '../../services/loader.service';

@Component({
  selector: 'app-loader-with-fallback',
  imports: [CommonModule],
  templateUrl: './loader-with-svg-fallback.component.html',
  styleUrl: './loader.component.scss'
})
export class LoaderWithSvgFallbackComponent {
  useImage = true;

  constructor(public loaderService: LoaderService) {}
}
