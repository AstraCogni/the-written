// Injected into Playwright pages as an init script before any page JS runs.
// Simulates window.API_1484_11 (SCORM 2004) or window.API (SCORM 1.2).

const MOCK_2004 = `
window.API_1484_11 = (function() {
  var data = {};
  return {
    Initialize:     function()    { return 'true'; },
    SetValue:       function(k,v) { data[k] = v; return 'true'; },
    GetValue:       function(k)   { return data[k] || ''; },
    Commit:         function()    { return 'true'; },
    Terminate:      function()    { return 'true'; },
    GetLastError:   function()    { return '0'; },
    GetErrorString: function()    { return ''; },
    GetDiagnostic:  function()    { return ''; },
    _getData:       function()    { return data; }
  };
})();
`;

const MOCK_12 = `
window.API = (function() {
  var data = {};
  return {
    LMSInitialize:     function()    { return 'true'; },
    LMSSetValue:       function(k,v) { data[k] = v; return 'true'; },
    LMSGetValue:       function(k)   { return data[k] || ''; },
    LMSCommit:         function()    { return 'true'; },
    LMSFinish:         function()    { return 'true'; },
    LMSGetLastError:   function()    { return '0'; },
    LMSGetErrorString: function()    { return ''; },
    LMSGetDiagnostic:  function()    { return ''; },
    _getData:          function()    { return data; }
  };
})();
`;

module.exports = { MOCK_2004, MOCK_12 };
