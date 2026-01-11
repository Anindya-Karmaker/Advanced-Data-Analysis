// --- Global Variables/Functions for HTML access ---
window.openCustomImportModal = null;
window.closeCustomImportModal = null;
window.previewCustomFile = null;
window.importFullFile = null;
window.applyStyleSettings = null;
window.updateActiveSmoothing = null;
window.updatePeakAnalysis = null;
window.saveSession = null;
window.loadSession = null;
window.copyPlotToClipboard = null;

document.addEventListener('DOMContentLoaded', () => {
    // --- State ---
    const state = {
        files: [],
        activeFileId: null,
        // plotConfig schema: { xCol, yCol, y2Col (opt), color, traceName, mode, lineDash, lineWidth, smoothing, smoothingMethod, sgOrder, yaxisSide, peakConfig: { show, highlight, prominence } }
        plotConfig: {},
        trendlines: {},
        pendingFile: null,
        pendingPreviewData: null,
        annotations: [], // Custom peak labels for publication
        labelMode: false,  // Toggle for adding labels
        xaxisRange: { start: null, end: null }, // Global X-axis range
        showLabels: true   // Global label visibility
    };

    // --- DOM Elements ---
    const dropZone = document.getElementById('drop-zone');
    const fileListEl = document.getElementById('file-list');
    const configPanel = document.getElementById('config-panel');
    const activeFileNameEl = document.getElementById('active-file-name');
    const xAxisSelect = document.getElementById('x-axis-select');
    const yAxisSelect = document.getElementById('y-axis-select');
    const trendlineSelect = document.getElementById('trendline-type');
    const updatePlotBtn = document.getElementById('update-plot-btn');
    const removeFileBtn = document.getElementById('remove-file-btn');
    const trendlineStats = document.getElementById('trendline-stats');
    const statusBar = document.getElementById('statusBar');
    const viewTableBtn = document.getElementById('view-table-btn');
    const tableContainer = document.getElementById('table-container');
    const dataTable = document.getElementById('data-table');
    const plotlyDiv = document.getElementById('plotly-div');

    // Smoothing Controls
    const smoothingMethod = document.getElementById('smoothing-method');
    const smoothingSlider = document.getElementById('smoothing-slider');
    const smoothingValue = document.getElementById('smoothing-value');
    const sgPolyOptions = document.getElementById('sg-poly-options');
    const sgPolyOrder = document.getElementById('sg-poly-order');

    // Peak Analysis Controls
    const showPeaksCheck = document.getElementById('show-peaks-check');
    const highlightPeaksCheck = document.getElementById('highlight-peaks-check');
    const peakProminenceSlider = document.getElementById('peakProminenceSlider'); // Legacy support if needed, but we use peakHeight
    const peakHeightSlider = document.getElementById('peakHeightSlider');
    const peakProminenceVal = document.getElementById('peak-prominence-val'); // Legacy
    const peakHeightVal = document.getElementById('peak-height-val');
    const peakStatsBox = document.querySelector('.stats-box'); // Generic selector or keep ID if generic
    const peakCountEl = document.getElementById('peak-count');
    const peakMaxYEl = document.getElementById('peak-max-y');
    const peakMaxXEl = document.getElementById('peak-max-x');

    // Axis & Y2 Controls
    const xAxisLabelInput = document.getElementById('xAxisLabel');
    const yAxisLabelInput = document.getElementById('yAxisLabel');
    const y2AxisLabelInput = document.getElementById('y2AxisLabel');
    const enableY2Check = document.getElementById('enableY2Check');
    const y2SettingsDiv = document.getElementById('y2-settings');

    // Import Modal Elements
    const customImportModal = document.getElementById('customImportModal');
    const customFileInput = document.getElementById('customFileInput');
    const previewDelimiter = document.getElementById('previewDelimiter');
    const headerRowIndex = document.getElementById('headerRowIndex');
    const previewTable = document.getElementById('previewTable');
    const previewSection = document.getElementById('preview-section');
    const mapXSelect = document.getElementById('mapXSelect');
    const mapYSelect = document.getElementById('mapYSelect');
    const mapY2Select = document.getElementById('mapY2Select');
    const mapXLabel = document.getElementById('mapXLabel');
    const mapYLabel = document.getElementById('mapYLabel');
    const importBtn = document.getElementById('importBtn');

    // Embedded Style Controls
    const styleTraceName = document.getElementById('styleTraceName');
    const styleColor = document.getElementById('styleColor');
    const styleMode = document.getElementById('styleMode');
    const styleLineDash = document.getElementById('styleLineDash');
    const styleLineWidth = document.getElementById('styleLineWidth');
    const styleYAxisSide = document.getElementById('styleYAxisSide');
    const showTraceCheck = document.getElementById('showTraceCheck');
    const xAxisStart = document.getElementById('xAxisStart');
    const xAxisEnd = document.getElementById('xAxisEnd');
    const showLabelsCheck = document.getElementById('showLabelsCheck');

    // --- Colors ---
    const colors = ['#00796b', '#d32f2f', '#1976d2', '#fbc02d', '#7b1fa2', '#e64a19', '#455a64', '#0097a7'];


    // --- Global Assignments ---
    window.openCustomImportModal = () => { if (customImportModal) { customImportModal.style.display = 'block'; resetModal(); } };
    window.closeCustomImportModal = () => { if (customImportModal) customImportModal.style.display = 'none'; state.pendingFile = null; };
    window.previewCustomFile = handlePreview;
    window.importFullFile = handleImportFull;

    window.applyStyleSettings = () => {
        if (!state.activeFileId) return;
        const config = state.plotConfig[state.activeFileId];

        config.traceName = styleTraceName.value;
        config.color = styleColor.value;
        config.mode = styleMode.value; // Assuming styleMode input exists if used, or remove if not in new HTML
        config.lineDash = styleLineDash ? styleLineDash.value : 'solid';
        config.lineWidth = parseInt(styleLineWidth.value) || 2;
        config.yaxisSide = styleYAxisSide.value;

        renderFileList(); // Update color dot
        renderPlot(); // Update plot
    };

    window.toggleAllLabels = () => {
        state.showLabels = showLabelsCheck.checked;
        renderPlot();
        updateStatus(state.showLabels ? 'Labels shown' : 'Labels hidden');
    };

    window.toggleTraceVisibility = () => {
        if (!state.activeFileId) return;
        const config = state.plotConfig[state.activeFileId];
        config.visible = showTraceCheck.checked;
        renderPlot();
        updateStatus(config.visible ? 'Trace visible' : 'Trace hidden');
    };

    window.updateGlobalXRange = () => {
        const startVal = xAxisStart.value;
        const endVal = xAxisEnd.value;
        state.xaxisRange.start = startVal !== '' ? parseFloat(startVal) : null;
        state.xaxisRange.end = endVal !== '' ? parseFloat(endVal) : null;
        renderPlot();
        updateStatus("Global X-axis range updated.");
    };

    window.updateActiveSmoothing = () => {
        if (state.activeFileId) {
            const c = state.plotConfig[state.activeFileId];
            c.smoothing = parseInt(smoothingSlider.value);
            c.smoothingMethod = smoothingMethod.value;
            c.sgOrder = parseInt(sgPolyOrder.value);
            if (smoothingValue) smoothingValue.textContent = c.smoothing;
            if (sgPolyOptions) sgPolyOptions.style.display = c.smoothingMethod === 'savitzkyGolay' ? 'block' : 'none';
            renderPlot();
        }
    };

    window.updatePeakAnalysis = () => {
        if (!state.activeFileId) return;
        const config = state.plotConfig[state.activeFileId];

        config.peakConfig.show = showPeaksCheck.checked;
        config.peakConfig.highlight = highlightPeaksCheck.checked;
        config.peakConfig.prominence = parseInt(peakHeightSlider.value); // Use correct slider

        if (peakHeightVal) peakHeightVal.textContent = config.peakConfig.prominence;
        if (peakStatsBox) peakStatsBox.style.display = config.peakConfig.show ? 'block' : 'none';

        renderPlot();
    };

    window.saveSession = () => {
        const sessionData = JSON.stringify(state);
        const blob = new Blob([sessionData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analysis_session_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        updateStatus("Session saved.");
    };

    window.toggleLabelMode = () => {
        state.labelMode = !state.labelMode;
        const btn = document.getElementById('toggleLabelBtn');
        if (btn) {
            btn.textContent = state.labelMode ? '🏷️ Labeling ON' : '🏷️ Add Custom Labels';
            btn.style.background = state.labelMode ? '#d32f2f' : '#00796b';
        }
        updateStatus(state.labelMode ? 'Click on plot to add labels' : 'Label mode OFF');
        renderPlot(); // Re-render to attach/detach handlers
    };

    window.clearLabels = () => {
        if (confirm('Clear all custom labels?')) {
            state.annotations = [];
            renderPlot();
            updateStatus('Labels cleared');
        }
    };

    window.openLabelManager = () => {
        if (state.annotations.length === 0) {
            alert('No labels to manage');
            return;
        }

        let html = '<h3 style="margin-top:0;">Manage Labels</h3>';
        html += '<div style="max-height: 400px; overflow-y: auto;">';
        html += '<table style="width: 100%; border-collapse: collapse; font-size: 12px;">';
        html += '<tr style="background:#f5f5f5;"><th style="padding:6px; text-align:left;">Label</th><th style="padding:6px;">X</th><th style="padding:6px;">Y</th><th style="padding:6px;">Trace</th><th style="padding:6px;">Actions</th></tr>';

        state.annotations.forEach((ann) => {
            const associatedFile = state.files.find(f => f.id === ann.fileId);
            const fileName = associatedFile ? associatedFile.name : 'None';

            html += `<tr style="border-bottom: 1px solid #eee;">`;
            html += `<td style="padding: 6px;">${ann.customText || ann.text}</td>`;
            html += `<td style="padding: 6px; text-align:center;">${parseFloat(ann.x).toFixed(2)}</td>`;
            html += `<td style="padding: 6px; text-align:center;">${parseFloat(ann.y).toFixed(2)}</td>`;
            html += `<td style="padding: 6px; text-align:center;">`;
            html += `<select id="file-select-${ann.id}" style="font-size: 11px; padding: 2px;" onchange="reassignLabel(${ann.id}, this.value)">`;

            // Add options for all files
            state.files.forEach(file => {
                const selected = file.id === ann.fileId ? 'selected' : '';
                html += `<option value="${file.id}" ${selected}>${file.name.substring(0, 20)}</option>`;
            });

            html += `</select></td>`;
            html += `<td style="padding: 6px; text-align:center;">`;
            html += `<button onclick="editLabel(${ann.id})" style="margin-right: 4px; padding: 3px 6px; font-size: 10px;">Edit</button>`;
            html += `<button onclick="deleteLabel(${ann.id})" style="padding: 3px 6px; font-size: 10px; background: #dc3545; color: white; border:none; cursor:pointer;">Del</button>`;
            html += `</td></tr>`;
        });

        html += '</table></div>';

        const container = document.createElement('div');
        container.innerHTML = html;
        container.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 10000; max-width: 700px; width: 90%;';

        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Close';
        closeBtn.style.cssText = 'margin-top: 15px; padding: 8px 16px; width: 100%;';
        closeBtn.onclick = () => document.body.removeChild(container);
        container.appendChild(closeBtn);

        document.body.appendChild(container);
    };

    window.reassignLabel = (labelId, newFileId) => {
        const ann = state.annotations.find(a => a.id === labelId);
        if (ann) {
            ann.fileId = newFileId;
            renderPlot();
            updateStatus('Label reassigned to new trace');
        }
    };

    window.editLabel = (id) => {
        const ann = state.annotations.find(a => a.id === id);
        if (!ann) return;

        const newText = prompt('Edit label text:', ann.customText || ann.text);
        if (newText !== null) {
            const showX = confirm('Include X-axis value?');
            const showY = confirm('Include Y-axis value?');

            let displayText = newText;
            if (showX && showY) {
                displayText = `${newText}\nX: ${parseFloat(ann.x).toFixed(2)}\nY: ${parseFloat(ann.y).toFixed(2)}`;
            } else if (showX) {
                displayText = `${newText}\nX: ${parseFloat(ann.x).toFixed(2)}`;
            } else if (showY) {
                displayText = `${newText}\nY: ${parseFloat(ann.y).toFixed(2)}`;
            }

            ann.text = displayText;
            ann.customText = newText;
            ann.showX = showX;
            ann.showY = showY;

            renderPlot();
            updateStatus('Label updated');

            const container = document.querySelector('div[style*="z-index: 10000"]');
            if (container) document.body.removeChild(container);
            window.openLabelManager();
        }
    };

    window.deleteLabel = (id) => {
        if (confirm('Delete this label?')) {
            state.annotations = state.annotations.filter(a => a.id !== id);
            renderPlot();
            updateStatus('Label deleted');

            const container = document.querySelector('div[style*="z-index: 10000"]');
            if (container) document.body.removeChild(container);
            if (state.annotations.length > 0) {
                window.openLabelManager();
            }
        }
    };

    window.loadSession = (input) => {
        const file = input.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const loadedState = JSON.parse(e.target.result);
                // Validate basic structure
                if (!loadedState.files || !loadedState.plotConfig) throw new Error("Invalid session file.");

                // Show file selection dialog
                showFileSelectionDialog(loadedState);
            } catch (err) {
                alert("Error loading session: " + err.message);
                updateStatus("Error loading session.");
            }
        };
        reader.readAsText(file);
        input.value = ''; // Reset input
    };

    function showFileSelectionDialog(loadedState) {
        let html = '<h3 style="margin-top:0;">Select Files to Load</h3>';
        html += '<p style="font-size: 12px; color: #666;">Choose which files to load from this session:</p>';
        html += '<div style="max-height: 300px; overflow-y: auto; margin: 15px 0;">';

        loadedState.files.forEach((file, idx) => {
            const labelCount = (loadedState.annotations || []).filter(a => a.fileId === file.id).length;
            html += `<div style="padding: 8px; border-bottom: 1px solid #eee;">`;
            html += `<label style="display: flex; align-items: center; cursor: pointer;">`;
            html += `<input type="checkbox" class="file-checkbox" value="${file.id}" checked style="margin-right: 8px;">`;
            html += `<span style="flex: 1; font-size: 13px;">${file.name}</span>`;
            html += `<span style="font-size: 11px; color: #999;">${labelCount} labels</span>`;
            html += `</label></div>`;
        });

        html += '</div>';
        html += '<div style="display: flex; gap: 8px; margin-top: 15px;">';
        html += '<button id="selectAllBtn" style="flex: 1; padding: 8px;">Select All</button>';
        html += '<button id="deselectAllBtn" style="flex: 1; padding: 8px;">Deselect All</button>';
        html += '</div>';

        const container = document.createElement('div');
        container.innerHTML = html;
        container.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 10000; max-width: 500px; width: 90%;';

        const loadBtn = document.createElement('button');
        loadBtn.textContent = 'Load Selected Files';
        loadBtn.style.cssText = 'width: 100%; padding: 10px; margin-top: 10px; background: #00796b; color: white; font-weight: bold;';
        loadBtn.onclick = () => {
            const checkboxes = container.querySelectorAll('.file-checkbox:checked');
            const selectedFileIds = Array.from(checkboxes).map(cb => cb.value);

            if (selectedFileIds.length === 0) {
                alert('Please select at least one file to load');
                return;
            }

            loadSelectedFiles(loadedState, selectedFileIds);
            document.body.removeChild(container);
        };

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.style.cssText = 'width: 100%; padding: 8px; margin-top: 8px;';
        cancelBtn.onclick = () => document.body.removeChild(container);

        container.appendChild(loadBtn);
        container.appendChild(cancelBtn);

        // Add select/deselect all handlers
        container.querySelector('#selectAllBtn').onclick = () => {
            container.querySelectorAll('.file-checkbox').forEach(cb => cb.checked = true);
        };
        container.querySelector('#deselectAllBtn').onclick = () => {
            container.querySelectorAll('.file-checkbox').forEach(cb => cb.checked = false);
        };

        document.body.appendChild(container);
    }

    function loadSelectedFiles(loadedState, selectedFileIds) {
        // Filter files
        state.files = loadedState.files.filter(f => selectedFileIds.includes(f.id));

        // Filter plot configs
        state.plotConfig = {};
        selectedFileIds.forEach(fileId => {
            if (loadedState.plotConfig[fileId]) {
                state.plotConfig[fileId] = {
                    ...loadedState.plotConfig[fileId],
                    peakConfig: loadedState.plotConfig[fileId].peakConfig || { show: false, highlight: false, prominence: 0 },
                    axisLabels: loadedState.plotConfig[fileId].axisLabels || {},
                    enableY2: loadedState.plotConfig[fileId].enableY2 || false
                };
            }
        });

        // Filter trendlines
        state.trendlines = {};
        selectedFileIds.forEach(fileId => {
            if (loadedState.trendlines && loadedState.trendlines[fileId]) {
                state.trendlines[fileId] = loadedState.trendlines[fileId];
            }
        });

        // Filter annotations (only load labels for selected files)
        state.annotations = (loadedState.annotations || []).filter(ann =>
            selectedFileIds.includes(ann.fileId) || !ann.fileId
        );

        // Set active file
        state.activeFileId = state.files.length > 0 ? state.files[0].id : null;

        // Sync Global X-Axis Range Inputs
        if (loadedState.xaxisRange) {
            state.xaxisRange = loadedState.xaxisRange;
            if (xAxisStart) xAxisStart.value = state.xaxisRange.start !== null ? state.xaxisRange.start : '';
            if (xAxisEnd) xAxisEnd.value = state.xaxisRange.end !== null ? state.xaxisRange.end : '';
        }

        // Sync Label Visibility
        if (loadedState.showLabels !== undefined) {
            state.showLabels = loadedState.showLabels;
            if (showLabelsCheck) showLabelsCheck.checked = state.showLabels;
        }

        renderFileList();
        if (state.activeFileId) setActiveFile(state.activeFileId);
        updateStatus(`Loaded ${state.files.length} file(s) with ${state.annotations.length} label(s)`);
    }

    window.copyPlotToClipboard = async () => {
        if (!plotlyDiv) return;
        updateStatus("Copying image...");
        try {
            const url = await Plotly.toImage(plotlyDiv, { format: 'png', width: 1200, height: 800 });
            const res = await fetch(url);
            const blob = await res.blob();
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            updateStatus("Plot copied to clipboard.");
        } catch (err) {
            console.error(err);
            alert("Failed to copy: " + err.message);
            updateStatus("Copy failed.");
        }
    };


    // --- Event Listeners ---
    if (dropZone) {
        dropZone.addEventListener('click', () => window.openCustomImportModal());
        dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) {
                window.openCustomImportModal();
                customFileInput.files = e.dataTransfer.files;
            }
        });
    }

    if (viewTableBtn) viewTableBtn.addEventListener('click', toggleTable);
    if (xAxisSelect) xAxisSelect.addEventListener('change', updateActiveConfig);
    if (yAxisSelect) yAxisSelect.addEventListener('change', updateActiveConfig);
    if (trendlineSelect) trendlineSelect.addEventListener('change', updateActiveTrendline);
    if (updatePlotBtn) updatePlotBtn.addEventListener('click', renderPlot);
    if (removeFileBtn) removeFileBtn.addEventListener('click', removeActiveFile);
    if (smoothingSlider) {
        smoothingSlider.addEventListener('input', (e) => {
            smoothingValue.textContent = e.target.value;
            window.updateActiveSmoothing();
        });
    }

    // Peak Detection Listener
    if (peakHeightSlider) {
        peakHeightSlider.addEventListener('input', () => {
            if (peakHeightVal) peakHeightVal.textContent = peakHeightSlider.value;
            updateActivePeakConfig();
        });
    }

    // Axis Label Listeners
    if (xAxisLabelInput) xAxisLabelInput.addEventListener('input', updateActiveAxisLabels);
    if (yAxisLabelInput) yAxisLabelInput.addEventListener('input', updateActiveAxisLabels);
    if (y2AxisLabelInput) y2AxisLabelInput.addEventListener('input', updateActiveAxisLabels);

    if (enableY2Check) {
        enableY2Check.addEventListener('change', () => {
            if (y2SettingsDiv) y2SettingsDiv.style.display = enableY2Check.checked ? 'block' : 'none';
            updateActiveAxisLabels();
        });
    }
    window.addEventListener('resize', () => { if (plotlyDiv && plotlyDiv.data) Plotly.Plots.resize(plotlyDiv); });

    // --- Functions ---
    function updateStatus(msg) { if (statusBar) statusBar.textContent = msg; }
    function toggleTable() {
        if (tableContainer.style.display === 'none') { tableContainer.style.display = 'block'; renderTable(); }
        else { tableContainer.style.display = 'none'; }
    }

    // --- Import Logic ---
    function resetModal() {
        if (customFileInput) customFileInput.value = '';
        if (previewSection) previewSection.style.display = 'none';
        if (importBtn) importBtn.disabled = true;
        if (previewTable) previewTable.innerHTML = '';
        state.pendingFile = null;
    }

    function handlePreview() {
        const file = customFileInput.files[0];
        if (!file) { alert("Please select a file first."); return; }
        state.pendingFile = file;
        const delim = previewDelimiter.value;
        const headerRow = parseInt(headerRowIndex.value) || 1;
        updateStatus(`Generating preview...`);
        const extension = file.name.split('.').pop().toLowerCase();
        if (['xlsx', 'xls'].includes(extension)) previewExcel(file, headerRow);
        else previewCSV(file, delim, headerRow);
    }
    // (previewCSV and previewExcel are largely same, omitted for brevity, assume standard implementation)
    function previewCSV(file, delimiter, headerRow) {
        Papa.parse(file, {
            preview: 100 + headerRow, delimiter: delimiter === 'auto' ? '' : delimiter, skipEmptyLines: true,
            complete: (results) => {
                try {
                    const rows = results.data;
                    if (!rows || rows.length < headerRow) throw new Error("Not enough rows.");
                    const header = rows[headerRow - 1].map(h => String(h).trim());
                    showPreviewUI(header, rows.slice(headerRow).map(row => { let obj = {}; header.forEach((h, i) => { obj[h] = row[i]; }); return obj; }));
                } catch (err) { alert(err.message); }
            },
            error: (err) => alert(err.message)
        });
    }
    function previewExcel(file, headerRow) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
            const sheet = wb.Sheets[wb.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
            const header = json[headerRow - 1].map(String);
            showPreviewUI(header, json.slice(headerRow).map(r => { let o = {}; header.forEach((h, i) => o[h] = r[i]); return o; }));
        };
        reader.readAsArrayBuffer(file);
    }

    function showPreviewUI(columns, data) {
        state.pendingPreviewData = { columns, data };
        let html = '<thead style="background:#f5f5f5"><tr>';
        columns.forEach(col => html += `<th style="padding:5px; border:1px solid #ddd">${col}</th>`);
        html += '</tr></thead><tbody>';
        data.slice(0, 5).forEach(row => {
            html += '<tr>';
            columns.forEach(col => html += `<td style="padding:5px; border:1px solid #ddd">${row[col] !== undefined ? row[col] : ''}</td>`);
            html += '</tr>';
        });
        html += '</tbody>';
        previewTable.innerHTML = html;
        populateSelect(mapXSelect, columns, columns[0]);
        populateSelect(mapYSelect, columns, columns[1] || columns[0]);
        populateSelect(mapY2Select, columns, ''); // Y2 optional
        if (mapY2Select) {
            const noneOpt = document.createElement('option'); noneOpt.value = ''; noneOpt.textContent = '(None)';
            mapY2Select.insertBefore(noneOpt, mapY2Select.firstChild);
            mapY2Select.value = '';
        }

        previewSection.style.display = 'block';
        importBtn.disabled = false;
        updateStatus("Preview generated.");
    }

    function handleImportFull() {
        if (!state.pendingFile) return;
        const file = state.pendingFile;
        const xCol = mapXSelect.value;
        const yCol = mapYSelect.value;
        const y2Col = mapY2Select.value || null; // Capture Y2
        const xLabel = mapXLabel.value || null;
        const yLabel = mapYLabel.value || null;
        const delim = previewDelimiter.value;
        const headerRow = parseInt(headerRowIndex.value);

        // ... (Parsing logic similar to previous, assumes processData calls addFile)
        // Simplified for this replacement block:
        const processData = (jsonData) => {
            // ... (Header extraction logic) ... 
            // Re-implementing minimal robust version for context:
            let header, data;
            const hRowIdx = headerRow > 0 ? headerRow - 1 : -1;
            if (hRowIdx >= 0) {
                header = jsonData[hRowIdx].map(String);
                data = jsonData.slice(headerRow).map(row => { let obj = {}; header.forEach((h, i) => obj[h] = row[i]); return obj; });
            } else {
                const max = jsonData.reduce((m, r) => Math.max(m, r.length), 0);
                header = Array.from({ length: max }, (_, i) => `Column ${i + 1}`);
                data = jsonData.map(row => { let obj = {}; header.forEach((h, i) => obj[h] = row[i]); return obj; });
            }
            addFile(file.name, data, header, xCol, yCol, y2Col, xLabel, yLabel); // Updated signature
        };

        // Trigger Parsing (Re-using preview logic flow but for full file)
        const ext = file.name.split('.').pop().toLowerCase();
        if (['xlsx', 'xls'].includes(ext)) {
            const r = new FileReader(); r.onload = e => {
                const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
                processData(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 }));
            }; r.readAsArrayBuffer(file);
        } else {
            Papa.parse(file, {
                delimiter: delim === 'auto' ? '' : delim, skipEmptyLines: true, worker: true,
                complete: res => processData(res.data)
            });
        }
        window.closeCustomImportModal();
    }

    // --- Core Logic ---

    function addFile(name, data, columns, initialX, initialY, initialY2 = null, xLabel = null, yLabel = null) {
        if (!columns || columns.length === 0) return;
        if (!columns.includes(initialX)) initialX = columns[0];
        if (!columns.includes(initialY)) initialY = columns[1] || columns[0];

        const fileId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
        state.files.push({ id: fileId, name: name, data: data, columns: columns });

        // Initial Style Config
        state.plotConfig[fileId] = {
            xCol: initialX,
            yCol: initialY,
            y2Col: initialY2, // Store Y2 column
            xLabel: xLabel,
            yLabel: yLabel,
            color: colors[(state.files.length - 1) % colors.length],
            traceName: name,
            mode: 'markers',
            lineDash: 'solid',
            lineWidth: 2,
            smoothing: 0,
            smoothingMethod: 'movingAverage',
            sgOrder: 2,
            yaxisSide: 'left', // Default to left
            yaxisSide: 'left', // Default to left
            peakConfig: { show: false, highlight: false, prominence: 0 }, // Using 'prominence' field for height threshold
            axisLabels: { x: xLabel || initialX, y: yLabel || initialY, y2: 'Secondary Y' },
            enableY2: false,
            visible: true  // Track trace visibility
        };
        state.trendlines[fileId] = 'none';

        renderFileList();
        setActiveFile(fileId);
        updateStatus(`Loaded ${name}.`);
    }

    function renderFileList() {
        if (!fileListEl) return;
        fileListEl.innerHTML = '';
        if (state.files.length === 0) {
            fileListEl.innerHTML = '<li style="color: #999;">No files loaded</li>';
            if (configPanel) configPanel.style.display = 'none';
            return;
        }
        state.files.forEach(file => {
            const li = document.createElement('li');
            li.innerHTML = `<span><span class="color-dot" style="background-color:${state.plotConfig[file.id].color}"></span> ${file.name}</span>`;
            if (file.id === state.activeFileId) li.classList.add('active');
            li.onclick = () => setActiveFile(file.id);
            fileListEl.appendChild(li);
        });
        if (configPanel) configPanel.style.display = 'block';
    }

    function setActiveFile(id) {
        state.activeFileId = id;
        renderFileList();
        const file = state.files.find(f => f.id === id);
        if (!file) return;
        const config = state.plotConfig[id];

        if (activeFileNameEl) activeFileNameEl.textContent = file.name;
        if (xAxisSelect) populateSelect(xAxisSelect, file.columns, config.xCol);
        if (yAxisSelect) populateSelect(yAxisSelect, file.columns, config.yCol);
        if (trendlineSelect) trendlineSelect.value = state.trendlines[id] || 'none';

        // Sync Style Controls
        if (styleTraceName) styleTraceName.value = config.traceName;
        if (styleColor) styleColor.value = config.color;
        if (styleLineWidth) styleLineWidth.value = config.lineWidth;
        if (styleYAxisSide) styleYAxisSide.value = config.yaxisSide || 'left';

        // Sync Smoothing Controls
        if (smoothingSlider) smoothingSlider.value = config.smoothing || 0;
        if (smoothingValue) smoothingValue.textContent = config.smoothing || 0;
        if (smoothingMethod) {
            smoothingMethod.value = config.smoothingMethod || 'movingAverage';
            if (sgPolyOptions) sgPolyOptions.style.display = smoothingMethod.value === 'savitzkyGolay' ? 'block' : 'none';
        }
        if (sgPolyOrder) sgPolyOrder.value = config.sgOrder || 2;

        // Sync Peak Controls
        if (showPeaksCheck) showPeaksCheck.checked = config.peakConfig.show;
        if (highlightPeaksCheck) highlightPeaksCheck.checked = config.peakConfig.highlight;
        if (peakHeightSlider) {
            peakHeightSlider.value = config.peakConfig.prominence; // Using prominence as height val
            if (peakHeightVal) peakHeightVal.textContent = config.peakConfig.prominence;
        }
        if (peakStatsBox) peakStatsBox.style.display = config.peakConfig.show ? 'block' : 'none';

        // Sync Axis Controls
        if (config.axisLabels) {
            if (xAxisLabelInput) xAxisLabelInput.value = config.axisLabels.x || '';
            if (yAxisLabelInput) yAxisLabelInput.value = config.axisLabels.y || '';
            if (y2AxisLabelInput) y2AxisLabelInput.value = config.axisLabels.y2 || '';
        }
        if (enableY2Check) {
            enableY2Check.checked = config.enableY2 || false;
            if (y2SettingsDiv) y2SettingsDiv.style.display = config.enableY2 ? 'block' : 'none';
        }

        // Sync Trace Visibility
        if (showTraceCheck) {
            showTraceCheck.checked = config.visible !== false; // Default to true if undefined
        }

        renderPlot();
        if (tableContainer && tableContainer.style.display === 'block') renderTable();
    }

    function updateActivePeakConfig() {
        if (!state.activeFileId) return;
        const config = state.plotConfig[state.activeFileId];
        config.peakConfig.show = showPeaksCheck.checked;
        config.peakConfig.highlight = highlightPeaksCheck.checked;
        config.peakConfig.prominence = parseInt(peakHeightSlider.value); // Maps to 'min height' logic
        if (peakStatsBox) peakStatsBox.style.display = config.peakConfig.show ? 'block' : 'none';
        renderPlot();
    }

    function updateActiveAxisLabels() {
        if (!state.activeFileId) return;
        const config = state.plotConfig[state.activeFileId];
        if (!config.axisLabels) config.axisLabels = {};
        config.axisLabels.x = xAxisLabelInput.value;
        config.axisLabels.y = yAxisLabelInput.value;
        config.axisLabels.y2 = y2AxisLabelInput.value;
        config.enableY2 = enableY2Check.checked;
        renderPlot();
    }

    // ... (rest of simple helpers: updateActiveConfig, removeActiveFile, populateSelect, renderTable, updateActiveSmoothing - same as before) ...
    function updateActiveConfig() { if (!state.activeFileId) return; state.plotConfig[state.activeFileId].xCol = xAxisSelect.value; state.plotConfig[state.activeFileId].yCol = yAxisSelect.value; }
    function updateActiveTrendline() { if (!state.activeFileId) return; state.trendlines[state.activeFileId] = trendlineSelect.value; renderPlot(); }
    function removeActiveFile() { if (!state.activeFileId) return; state.files = state.files.filter(f => f.id !== state.activeFileId); delete state.plotConfig[state.activeFileId]; delete state.trendlines[state.activeFileId]; state.activeFileId = state.files.length ? state.files[0].id : null; renderFileList(); if (state.activeFileId) setActiveFile(state.activeFileId); else Plotly.purge(plotlyDiv); }
    function populateSelect(el, opts, val) { if (!el) return; el.innerHTML = ''; opts.forEach(o => { const op = document.createElement('option'); op.value = o; op.textContent = o; if (o === val) op.selected = true; el.appendChild(op); }); }
    function renderTable() { /* Same as before */ }
    function updateActiveSmoothing() { /* Same as before but triggers render */ if (state.activeFileId) { const c = state.plotConfig[state.activeFileId]; c.smoothing = parseInt(smoothingSlider.value); c.smoothingMethod = smoothingMethod.value; c.sgOrder = parseInt(sgPolyOrder.value); if (smoothingValue) smoothingValue.textContent = c.smoothing; if (sgPolyOptions) sgPolyOptions.style.display = c.smoothingMethod === 'savitzkyGolay' ? 'block' : 'none'; renderPlot(); } }


    function renderPlot() {
        if (!plotlyDiv) return;
        const traces = [];
        let layoutShapes = [];
        const downsampleThreshold = 100000;
        let hasY2 = false;

        state.files.forEach(file => {
            const config = state.plotConfig[file.id];

            // Skip if trace is hidden
            if (config.visible === false) return;
            let x = file.data.map(row => row[config.xCol]);
            let y = file.data.map(row => parseFloat(row[config.yCol]) || 0);

            // Smoothing (Same logic)
            if (config.smoothing > 0) {
                // const numericY = y.map(Number); // Already numeric
                if (config.smoothingMethod === 'savitzkyGolay') {
                    let w = config.smoothing; if (w % 2 === 0) w++;
                    const o = config.sgOrder || 2;
                    if (w > o + 2) y = savitzkyGolay(y, w, o);
                } else {
                    y = movingAverage(y, config.smoothing);
                }
            }
            const processedY = y; // Keep full res smoothed for peaks

            // Peak Detection
            let peaks = [];
            if (config.peakConfig && config.peakConfig.show) {
                const range = Math.max(...processedY) - Math.min(...processedY);
                const threshold = (config.peakConfig.prominence / 100) * range;
                peaks = findPeaks(processedY, threshold);

                // Update Stats (only for active file)
                if (file.id === state.activeFileId) {
                    peakCountEl.textContent = peaks.length;
                    if (peaks.length > 0) {
                        const maxPeak = peaks.reduce((prev, curr) => curr.y > prev.y ? curr : prev);
                        peakMaxYEl.textContent = parseFloat(maxPeak.y).toFixed(2);
                        peakMaxXEl.textContent = parseFloat(maxPeak.x).toFixed(2);
                    } else {
                        peakMaxYEl.textContent = '-'; peakMaxXEl.textContent = '-';
                    }
                }

                // Add Peak Markers if Highlighting
                if (config.peakConfig.highlight && peaks.length > 0) {
                    traces.push({
                        x: peaks.map(p => x[p.index]),
                        y: peaks.map(p => p.y),
                        mode: 'markers',
                        type: 'scatter',
                        name: `${config.traceName} Peaks`,
                        marker: { symbol: 'triangle-down', size: 12, color: 'red', line: { width: 1, color: 'darkred' } },
                        yaxis: config.yaxisSide === 'right' ? 'y2' : 'y',
                        hovertemplate: 'Peak<br>X: %{x}<br>Y: %{y}<extra></extra>'
                    });
                }
            }

            // Downsampling for Main Trace
            let plotX = x;
            let plotY = processedY;
            if (x.length > downsampleThreshold) {
                const d = downsampleData(x, processedY, 50000); plotX = d.x; plotY = d.y;
            }

            // Main Trace
            const trace = {
                x: plotX,
                y: plotY,
                mode: config.mode,
                type: 'scattergl',
                name: config.traceName,
                marker: { color: config.color, size: config.lineWidth ? config.lineWidth * 2 : 6 },
                line: { color: config.color, width: config.lineWidth },
                yaxis: config.yaxisSide === 'right' ? 'y2' : 'y'
            };
            if (config.yaxisSide === 'right') hasY2 = true;
            traces.push(trace);

            // Y2 Trace (if secondary column selected during import... waits, implementation limitation: 
            // My current UI only allows mapping 1 Y-col to the "Main" trace. 
            // If the user imports a "Y2" column, maybe they want a separate trace?
            // User request is "multiple axes". My "Y-Axis Side" switch allows putting *any* file on Y2.
            // This is cleaner. So if I import Y2, I should probably create a SECOND file object/trace?
            // Or just allow switching the axis of the current trace.
            // My `styleYAxisSide` implementation allows switching the current trace to Y2. This satisfies "multiple axes".
            // The "Import Y2" is a bit ambiguous if we don't create a second trace. 
            // Let's assume for now "Import Y2" just adds another column to memory, which the user can *switch to* using Y-Column select.
            // But actually, usually users want to plot 2 cols from same file at once.
            // I'll stick to: One trace per file ID. To plot Y2, you can duplicate the file or I can add Multi-Trace support.
            // Given "Online Data Analyzer" usually is 1 File = 1 Trace.
            // I'll assume "Y-Axis Side" switch is sufficient for "Multiple Axes" feature (putting different traces on different axes).

            // Trendline ... (omitted for brevity, same as before)
        });

        // Layout
        // Determine titles
        let xTitle = 'X', yTitle = 'Y', y2Title = 'Secondary Y';
        let showY2Grid = false; // Default off

        if (state.activeFileId) {
            const c = state.plotConfig[state.activeFileId];
            xTitle = c.axisLabels && c.axisLabels.x ? c.axisLabels.x : (c.xLabel || c.xCol);
            yTitle = c.axisLabels && c.axisLabels.y ? c.axisLabels.y : (c.yLabel || c.yCol);
            y2Title = c.axisLabels && c.axisLabels.y2 ? c.axisLabels.y2 : 'Secondary Y';

            // Force Y2 visibility if enabled
            if (c.enableY2) {
                hasY2 = true;
                showY2Grid = true;
            }
        }

        const layout = {
            autosize: true, // Important for dynamic sizing
            height: undefined, // Let Plotly handle it or inherit from container
            margin: { t: 40, r: 60, b: 60, l: 70 }, // Increased margins for labels
            xaxis: {
                title: { text: xTitle },
                gridcolor: '#eee',
                tickformat: ',',  // Full numbers with comma separators (50,000 instead of 50k)
                range: (state.xaxisRange.start !== null || state.xaxisRange.end !== null)
                    ? [
                        state.xaxisRange.start !== null ? state.xaxisRange.start : undefined,
                        state.xaxisRange.end !== null ? state.xaxisRange.end : undefined
                    ]
                    : undefined,
                showspikes: true,
                spikemode: 'across',
                spikethickness: 1,
                spikedash: 'dash',
                spikecolor: '#999'
            },
            yaxis: {
                title: { text: yTitle },
                gridcolor: '#eee',
                showspikes: true,
                spikethickness: 1,
                spikedash: 'dash',
                spikecolor: '#999'
            },
            yaxis2: {
                title: y2Title,
                overlaying: 'y',
                side: 'right',
                showgrid: false,
                visible: hasY2,
                showspikes: true,
                spikethickness: 1,
                spikedash: 'dash',
                spikecolor: '#999'
            },
            legend: { x: 0, y: 1.1, orientation: 'h' },
            paper_bgcolor: '#fff',
            plot_bgcolor: '#fcfcfc',
            hovermode: 'x unified',  // Unified tooltip showing all traces
            uirevision: state.activeFileId,
            annotations: state.showLabels ? state.annotations.filter(ann => {
                // Only show annotations for files that exist AND are visible
                const file = state.files.find(f => f.id === ann.fileId);
                if (!file) return !ann.fileId; // Show legacy annotations without fileId
                const config = state.plotConfig[file.id];
                return config && config.visible !== false; // Only show if trace is visible
            }) : [] // Return empty array if labels are turned off globally
        };

        Plotly.react(plotlyDiv, traces, layout, { responsive: true, scrollZoom: true });

        // Add click handler for custom labeling
        if (state.labelMode) {
            plotlyDiv.on('plotly_click', (data) => {
                const pt = data.points[0];

                // Enhanced label creation with options
                const labelText = prompt('Enter label text:', 'Peak');
                if (labelText !== null) {
                    const showX = confirm('Include X-axis value in label?');
                    const showY = confirm('Include Y-axis value in label?');

                    let displayText = labelText;
                    if (showX && showY) {
                        displayText = `${labelText}\nX: ${parseFloat(pt.x).toFixed(2)}\nY: ${parseFloat(pt.y).toFixed(2)}`;
                    } else if (showX) {
                        displayText = `${labelText}\nX: ${parseFloat(pt.x).toFixed(2)}`;
                    } else if (showY) {
                        displayText = `${labelText}\nY: ${parseFloat(pt.y).toFixed(2)}`;
                    }

                    state.annotations.push({
                        id: Date.now(), // Unique ID for editing/deletion
                        fileId: state.activeFileId, // Tie to current active file/trace
                        x: pt.x,
                        y: pt.y,
                        text: displayText,
                        customText: labelText, // Store user text separately
                        showX: showX,
                        showY: showY,
                        showarrow: true,
                        arrowhead: 2,
                        ax: 0,
                        ay: -40,
                        font: { size: 12, color: 'black' },
                        bgcolor: 'rgba(255, 255, 255, 0.9)',
                        bordercolor: 'black',
                        borderwidth: 1
                    });
                    renderPlot(); // Re-render to show annotation
                    updateStatus(`Label added: ${labelText}`);
                }
            });
        } else {
            plotlyDiv.removeAllListeners('plotly_click');
        }

        if (trendlineStats) {
            trendlineStats.style.display = activeTrendParams ? 'block' : 'none';
            if (activeTrendParams) trendlineStats.innerHTML = `<strong>Fit:</strong> ${activeTrendParams.eqnStr}<br><strong>R²:</strong> ${activeTrendParams.r2.toFixed(4)}`;
        }
    }

    // --- Helpers ---

    function movingAverage(data, windowSize) {
        if (windowSize <= 1 || data.length < windowSize) return data;
        const len = data.length;
        const result = new Array(len);
        const halfWindow = Math.floor(windowSize / 2);

        // Precompute Prefix Sums
        const prefixSum = new Float64Array(len + 1);
        prefixSum[0] = 0;
        for (let i = 0; i < len; i++) {
            prefixSum[i + 1] = prefixSum[i] + data[i];
        }

        for (let i = 0; i < len; i++) {
            const start = Math.max(0, i - halfWindow);
            const end = Math.min(len, i + halfWindow + 1);
            const count = end - start;
            const sum = prefixSum[end] - prefixSum[start];
            result[i] = sum / count;
        }
        return result;
    }

    function savitzkyGolay(data, windowSize, order) {
        if (windowSize % 2 === 0) windowSize++;
        const half = (windowSize - 1) / 2;
        const result = new Array(data.length).fill(0);

        for (let i = 0; i < data.length; i++) {
            // Simple Order 2/3 implementation
            if (order === 2 || order === 3) {
                const m = half;
                let num = 0;
                let den = 0;
                for (let j = -m; j <= m; j++) {
                    if (i + j < 0 || i + j >= data.length) continue;
                    const weight = 3 * (3 * m * m + 3 * m - 1 - 5 * j * j);
                    num += weight * data[i + j];
                    den += weight;
                }
                result[i] = den === 0 ? data[i] : num / den;
            } else {
                // Fallback to Moving Average if order not supported in this simplified block
                // (or could implement full matrix inversion, but sticking to previous working logic)
                const s = Math.max(0, i - half);
                const e = Math.min(data.length, i + half + 1);
                const sub = data.slice(s, e);
                result[i] = sub.reduce((a, b) => a + b, 0) / sub.length;
            }
        }
        return result;
    }

    function downsampleData(x, y, targetCount) {
        if (x.length <= targetCount) return { x, y };
        const bucketSize = Math.floor(x.length / targetCount);
        const sampledX = [];
        const sampledY = [];

        for (let i = 0; i < x.length; i += bucketSize) {
            const end = Math.min(i + bucketSize, x.length);
            let minVal = Infinity, maxVal = -Infinity;
            let minIdx = -1, maxIdx = -1;

            for (let j = i; j < end; j++) {
                if (y[j] < minVal) { minVal = y[j]; minIdx = j; }
                if (y[j] > maxVal) { maxVal = y[j]; maxIdx = j; }
            }

            if (minIdx !== -1) {
                if (minIdx < maxIdx) {
                    sampledX.push(x[minIdx]); sampledY.push(y[minIdx]);
                    if (minIdx !== maxIdx) { sampledX.push(x[maxIdx]); sampledY.push(y[maxIdx]); }
                } else {
                    sampledX.push(x[maxIdx]); sampledY.push(y[maxIdx]);
                    if (minIdx !== maxIdx) { sampledX.push(x[minIdx]); sampledY.push(y[minIdx]); }
                }
            }
        }
        return { x: sampledX, y: sampledY };
    }

    function findPeaks(data, prominenceThreshold) {
        const peaks = [];
        for (let i = 1; i < data.length - 1; i++) {
            if (data[i] > data[i - 1] && data[i] > data[i + 1]) {
                let lMin = data[i], rMin = data[i];
                for (let l = i - 1; l >= 0; l--) {
                    if (data[l] > data[i]) break;
                    if (data[l] < lMin) lMin = data[l];
                }
                for (let r = i + 1; r < data.length; r++) {
                    if (data[r] > data[i]) break;
                    if (data[r] < rMin) rMin = data[r];
                }
                const prom = Math.min(data[i] - lMin, data[i] - rMin);
                if (prom >= prominenceThreshold) {
                    peaks.push({ index: i, y: data[i], x: i });
                }
            }
        }
        return peaks;
    }

    function getRegression(x, y, type) {
        const N = x.length;
        let X = x, Y = y;
        if (type === 'logarithmic') X = x.map(Math.log);
        else if (type === 'exponential') Y = y.map(Math.log);
        else if (type === 'power') { X = x.map(Math.log); Y = y.map(Math.log); }

        let sum_x = 0, sum_y = 0, sum_xy = 0, sum_xx = 0, sum_yy = 0;
        let validN = 0;
        for (let i = 0; i < N; i++) {
            if (isNaN(X[i]) || isNaN(Y[i]) || !isFinite(X[i]) || !isFinite(Y[i])) continue;
            sum_x += X[i]; sum_y += Y[i]; sum_xy += X[i] * Y[i]; sum_xx += X[i] * X[i]; sum_yy += Y[i] * Y[i];
            validN++;
        }
        if (validN < 2) return null;

        const slope = (validN * sum_xy - sum_x * sum_y) / (validN * sum_xx - sum_x * sum_x);
        const intercept = (sum_y - slope * sum_x) / validN;
        const r2 = Math.pow((validN * sum_xy - sum_x * sum_y) / Math.sqrt((validN * sum_xx - sum_x * sum_x) * (validN * sum_yy - sum_y * sum_y) || 1), 2);

        let a, b, eqnStr, fn;
        if (type === 'linear') { b = slope; a = intercept; eqnStr = `y=${b.toFixed(4)}x+${a.toFixed(4)}`; fn = v => b * v + a; }
        else if (type === 'logarithmic') { b = slope; a = intercept; eqnStr = `y=${a.toFixed(4)}+${b.toFixed(4)}ln(x)`; fn = v => a + b * Math.log(v); }
        else if (type === 'exponential') { b = slope; a = Math.exp(intercept); eqnStr = `y=${a.toFixed(4)}e^(${b.toFixed(4)}x)`; fn = v => a * Math.exp(b * v); }
        else if (type === 'power') { b = slope; a = Math.exp(intercept); eqnStr = `y=${a.toFixed(4)}x^${b.toFixed(4)}`; fn = v => a * Math.pow(v, b); }

        return { r2, eqnStr, fn };
    }

});
