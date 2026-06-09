/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createApp } from 'vue';
import { MotionPlugin } from '@vueuse/motion';
import App from './App.vue';
import './index.css';

createApp(App).use(MotionPlugin).mount('#root');
