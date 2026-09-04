import { Component, input, output, ViewChildren, QueryList, ElementRef, AfterViewInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

export interface NavItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-bottom-navigation',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './bottom-navigation.component.html',
  styleUrl: './bottom-navigation.component.scss'
})
export class BottomNavigationComponent implements AfterViewInit {
  navItems = input.required<NavItem[]>();
  activeRoute = input.required<string>();
  
  navChange = output<string>();

  @ViewChildren('navItem') navItemElements!: QueryList<ElementRef>;
  @ViewChild('slidingBg') slidingBgElement!: ElementRef;
  @ViewChild('navContainer') navContainerElement!: ElementRef;

  ngAfterViewInit(): void {
    setTimeout(() => this.moveSliderToActive(), 100);
  }

  onNavChange(route: string): void {
    this.navChange.emit(route);
  }

  isActive(route: string): boolean {
    const currentRoute = this.activeRoute();
    
    if (currentRoute === route) {
      return true;
    }
    
    if (currentRoute.startsWith(route + '/')) {
      return true;
    }
    
    return false;
  }

  private moveSliderToActive(): void {
    if (!this.slidingBgElement || !this.navItemElements) return;

    const currentRoute = this.activeRoute();
    const items = this.navItems();

    const activeIndex = items.findIndex(item => {
      if (currentRoute === item.route) {
        return true;
      }
      if (currentRoute.startsWith(item.route + '/')) {
        return true;
      }
      return false;
    });

    if (activeIndex === -1) return;

    const navItemsArray = this.navItemElements.toArray();
    if (navItemsArray.length === 0 || !navItemsArray[activeIndex]) return;

    const activeElement = navItemsArray[activeIndex].nativeElement;
    const containerElement = this.navContainerElement.nativeElement;
    const pillElement = this.slidingBgElement.nativeElement;

    const containerRect = containerElement.getBoundingClientRect();
    const activeRect = activeElement.getBoundingClientRect();

    const left = (activeRect.left - containerRect.left) + 12;
    const contentWidth = activeElement.querySelector('.nav-item')?.getBoundingClientRect().width || activeRect.width;

    const pillWidth = Math.max(contentWidth, 40);

    pillElement.style.transform = `translateX(${left}px)`;
    pillElement.style.width = `${pillWidth}px`;
  }
}
