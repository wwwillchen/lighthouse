/**
 * @license
 * Copyright 2016 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

const Connection = require('./connection.js');
const WebSocket = require('ws');
const http = require('http');
const hostname = 'localhost';
const port = process.env.PORT || 9222;
const log = require('../../lib/log.js');

class CriConnection extends Connection {
  /**
   * @override
   * @return {!Promise}
   */
  connect() {
    return this._runJsonCommand('new').then(response => {
      log.log('CriConnection', '_runJsonCommand returned');
      const url = response.webSocketDebuggerUrl;
      log.log('CriConnection', 'websocket url acquired! ' + url);
      return new Promise((resolve, reject) => {
        const ws = new WebSocket(url);
        ws.on('open', () => {
          log.log('CriConnection', 'web socket opened!');
          this._ws = ws;
          resolve();
        });
        ws.on('message', data => this.handleRawMessage(data));
        ws.on('close', this.dispose.bind(this));
        ws.on('error', _ => {
          log.log('CriConnection', 'Error in web socket!');
          reject();
        });
      });
    });
  }

  /**
   * @return {!Promise<string>}
   */
  _runJsonCommand(command) {
    return new Promise((resolve, reject) => {
      log.log('CriConnection', 'running _runJsonCommand, waiting for response...');
      http.get({
        hostname: hostname,
        port: port,
        path: '/json/' + command
      }, response => {
        log.log('CriConnection', 'some kind of response from jsonCommand');
        var data = '';
        response.on('data', chunk => {
          log.log('CriConnection', 'jsonCommand data came in: ' + chunk);
          data += chunk;
        });
        response.on('end', _ => {
          log.log('CriConnection', 'end of response from jsonCommand. statusCode: ' +
              response.statusCode);
          if (response.statusCode === 200) {
            log.log('CriConnection', 'successful jsonCommand! data: ' + data);
            resolve(JSON.parse(data));
            return;
          }
          reject('Unable to fetch webSocketDebuggerUrl, status: ' + response.statusCode);
        });
      });
    });
  }

  /**
   * @override
   */
  disconnect() {
    if (!this._ws) {
      return Promise.reject('connect() must be called before attempting to disconnect.');
    }
    this._ws.removeAllListeners();
    this._ws.close();
    this._ws = null;
    return Promise.resolve();
  }

  /**
   * @override
   * @param {string} message
   */
  sendRawMessage(message) {
    this._ws.send(message);
  }
}

module.exports = CriConnection;
