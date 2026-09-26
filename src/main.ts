import {bootstrapApplication} from '@angular/platform-browser';
import {AppComponent} from './app/app.component';
import {appConfig} from './app/app.config';

// Suppress harmless Mediapipe/TensorFlow WebAssembly logs that might get caught as errors by preview tests
const originalConsoleLog = console.log;
const originalConsoleInfo = console.info;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

const suppressFilter = (args: any[]) => {
  if (args.length > 0 && typeof args[0] === 'string') {
    if (args[0].includes('Created TensorFlow Lite XNNPACK delegate')) return true;
    if (args[0].includes('XNNPACK')) return true;
  }
  return false;
};

console.log = (...args) => { if (!suppressFilter(args)) originalConsoleLog(...args); };
console.info = (...args) => { if (!suppressFilter(args)) originalConsoleInfo(...args); };
console.error = (...args) => { if (!suppressFilter(args)) originalConsoleError(...args); };
console.warn = (...args) => { if (!suppressFilter(args)) originalConsoleWarn(...args); };

bootstrapApplication(AppComponent, appConfig).catch((err) => console.error(err));
