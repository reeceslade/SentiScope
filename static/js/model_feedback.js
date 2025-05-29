document.addEventListener('DOMContentLoaded', function() {
  // Function to add data attributes to table cells for responsive design
  function addDataAttributesToTable() {
      const table = document.getElementById('feedback-table');
      const headerCells = table.querySelectorAll('thead th');
      const headerTexts = Array.from(headerCells).map(th => th.textContent.trim());
      
      const rows = table.querySelectorAll('tbody tr');
      rows.forEach(row => {
          const cells = row.querySelectorAll('td');
          cells.forEach((cell, index) => {
              if (index < headerTexts.length) {
                  cell.setAttribute('data-label', headerTexts[index]);
              }
          });
      });
  }
  
  // Fetch feedback data from API
  fetch('/api/model_feedback_stats')
      .then(response => response.json())
      .then(data => {
          const tableBody = document.querySelector("#feedback-table tbody");
          
          if (data.length === 0) {
              document.getElementById('no-data').style.display = 'block';
              document.getElementById('feedback-table').style.display = 'none';
              return;
          }

          data.forEach(row => {
              const tr = document.createElement("tr");
              tr.innerHTML = `
                  <td>${row.item_title}</td>
                  <td>${row.predicted_sentiment}</td>
                  <td>${row.model_used}</td>
                  <td>${row.feedback_type}</td>
                  <td>${row.feedback_text}</td>
                  <td>${row.timestamp}</td>
                  <td>${row.user_email}</td>
              `;
              tableBody.appendChild(tr);
          });
          
          // Add data attributes for responsive mobile view
          addDataAttributesToTable();
      })
      .catch(error => {
          console.error("Error fetching feedback data:", error);
          document.getElementById('no-data').style.display = 'block';
          document.getElementById('feedback-table').style.display = 'none';
      });
});