function initializeCategories() {
   const categorySelect = document.getElementById('categorySelect');

   // Clear existing options
   categorySelect.innerHTML = '';

   // Add new options
   const categories = [{
         value: 'online_news',
         text: 'News Articles'
      },
      {
         value: 'online_videos',
         text: 'Video Content'
      }
   ];

   categories.forEach(category => {
      const option = document.createElement('option');
      option.value = category.value;
      option.textContent = category.text;
      categorySelect.appendChild(option);
   });
}

// Load appropriate form elements based on category
function loadFormForCategory(category) {
   const container = document.getElementById('customElementsContainer');

   // Clear existing custom elements
   container.innerHTML = '';


   if (category === 'online_news') {
      loadNewsForm();
   } else if (category === 'online_videos') {
      loadVideosForm();
   }
}

// Update loadNewsForm function to add country-source mapping
function loadNewsForm() {
   const container = document.getElementById('customElementsContainer');

   // Country Selection
   const countryCol = document.createElement('div');
   countryCol.className = 'col-md-6';
   countryCol.innerHTML = `
            <label for="country" class="form-label fw-semibold">
                <i class="fas fa-globe me-2"></i>Country
            </label>
            <select name="country" id="country" class="form-select" required>
                <option value="us">United States</option>
                <option value="gb">United Kingdom</option>
            </select>
        `;
   container.appendChild(countryCol);

   // Source Selection
   const sourceCol = document.createElement('div');
   sourceCol.className = 'col-md-6';
   sourceCol.innerHTML = `
            <label for="sourceSelect" class="form-label fw-semibold">
                <i class="fas fa-newspaper me-2"></i>News Source
            </label>
            <select name="source" class="form-select" id="sourceSelect">
                <!-- UK Sources -->
                <option value="guardian">The Guardian</option>
                <option value="bbc-news">BBC News</option>
                <option value="newsweek">Newsweek</option>
                <option value="daily-mail">Daily Mail</option>
                <option value="the-sun">The Sun</option>

                <!-- US Sources -->
                <option value="msnbc">MSNBC</option>
                <option value="abc-news">ABC News</option>
                <option value="wsj">The Wall Street Journal</option>
                <option value="fox-news">Fox News</option>
                <option value="breitbart">Breitbart News</option>
            </select>
        `;
   container.appendChild(sourceCol);

   // Number of Articles
   const numArticlesCol = document.createElement('div');
   numArticlesCol.className = 'col-md-6';
   numArticlesCol.innerHTML = `
            <label for="num_articles" class="form-label fw-semibold">
                <i class="fas fa-list-ol me-2"></i>Number of Articles
            </label>
            <input type="number" class="form-control" name="num_articles" id="num_articles" 
                min="1" max="100" value="10" required>
        `;
   container.appendChild(numArticlesCol);

   // Sort By
   const sortCol = document.createElement('div');
   sortCol.className = 'col-md-6';
   sortCol.innerHTML = `
            <label for="sort_by" class="form-label fw-semibold">
                <i class="fas fa-sort me-2"></i>Sort By
            </label>
            <select name="sort_by" id="sort_by" class="form-select" required>
            <!-- 
                <option value="popularity">Most Popular</option>
            -->
                <option value="publishedAt">Most Recent</option>
            </select>
        `;
   container.appendChild(sortCol);

   // Add event listener to filter sources based on country
   document.getElementById('country').addEventListener('change', function () {
      updateSourceBasedOnCountry(this.value, 'news');
   });

   // Initialize sources based on default country selection
   updateSourceBasedOnCountry(document.getElementById('country').value, 'news');
}

// Update loadVideosForm function to add country-source mapping
function loadVideosForm() {
   const container = document.getElementById('customElementsContainer');

   // Video Platform Selection
   const platformCol = document.createElement('div');
   platformCol.className = 'col-md-6';
   platformCol.innerHTML = `
            <label for="platformSelect" class="form-label fw-semibold">
                <i class="fab fa-youtube me-2"></i>Platform
            </label>
            <select name="platform" class="form-select" id="platformSelect">
                <option value="youtube">YouTube</option>
            </select>
        `;
   container.appendChild(platformCol);

   const videoCountryCol = document.createElement('div');
   videoCountryCol.className = 'col-md-6';
   videoCountryCol.innerHTML = `
            <label for="country" class="form-label fw-semibold">
                <i class="fas fa-globe me-2"></i>Country
            </label>
            <select name="country" id="country" class="form-select" required>
                <option value="us">United States</option>
                <option value="gb">United Kingdom</option>
            </select>
        `;
   container.appendChild(videoCountryCol);

   const videoChannelCol = document.createElement('div');
   videoChannelCol.className = 'col-md-6';
   videoChannelCol.innerHTML = `
            <label for="channel" class="form-label fw-semibold">
                <i class="fas fa-broadcast-tower me-2"></i>Channel
            </label>
            <select name="channel" id="channel" class="form-select">
                <option value="UC16niRr50-MSBwiO3YDb3RA">BBC News</option>
                <option value="UCiFHCVp1YSy4sPye1v1yhDQ">MSNBC</option>
                <option value="UCXIJgqnII2ZOINSWNOGFThA">Fox News</option>
                <option value="UCZnUrseYETgW0e73AbqI7jQ">Newsweek</option>
                <option value="UCN1o_DQfpcNyahmOmQs1cYw">Daily Mail</option>
            </select>
        `;
   container.appendChild(videoChannelCol);

   // Number of Videos
   const numVideosCol = document.createElement('div');
   numVideosCol.className = 'col-md-6';
   numVideosCol.innerHTML = `
            <label for="num_videos" class="form-label fw-semibold">
                <i class="fas fa-list-ol me-2"></i>Number of Videos
            </label>
            <input type="number" class="form-control" name="num_videos" id="num_videos" 
                min="1" max="50" value="10" required>
        `;
   container.appendChild(numVideosCol);

   // Sort By for Videos
   const sortCol = document.createElement('div');
   sortCol.className = 'col-md-6';
   sortCol.innerHTML = `
            <label for="video_sort" class="form-label fw-semibold">
                <i class="fas fa-sort me-2"></i>Sort By
            </label>
            <select name="video_sort" id="video_sort" class="form-select" required>
                                <option value="date">Most Recent</option>
            <!--
                <option value="viewCount">Most Viewed</option>
                <option value="rating">Top Rated</option>
            -->
            </select>
        `;
   container.appendChild(sortCol);

   // Add event listener to filter channels based on country
   document.getElementById('country').addEventListener('change', function () {
      updateSourceBasedOnCountry(this.value, 'video');
   });

   // Initialize channels based on default country selection
   updateSourceBasedOnCountry(document.getElementById('country').value, 'video');
}

// Function to update source/channel based on country
function updateSourceBasedOnCountry(country, type) {
   if (type === 'news') {
      const sourceSelect = document.getElementById('sourceSelect');

      // Clear existing options
      sourceSelect.innerHTML = '';

      if (country === 'us') {
         // US news sources based on political leanings
         const sources = [{
               value: 'msnbc',
               text: 'MSNBC'
            }, // Left
            {
               value: 'newsweek',
               text: 'Newsweek'
            }, // Center
            {
               value: 'fox-news',
               text: 'Fox News'
            }, //  Right
         ];

         // Add options to source select
         sources.forEach(source => {
            const option = document.createElement('option');
            option.value = source.value;
            option.textContent = source.text;
            sourceSelect.appendChild(option);
         });
      } else if (country === 'gb') {
         // UK news sources based on political leanings
         const sources = [{
               value: 'bbc-news',
               text: 'BBC News'
            }, // Center
            {
               value: 'google-news-uk',
               text: 'Daily Mail'
            }, // Right
         ];

         // Add options to source select
         sources.forEach(source => {
            const option = document.createElement('option');
            option.value = source.value;
            option.textContent = source.text;
            sourceSelect.appendChild(option);
         });
      }
   } else if (type === 'video') {
      const channelSelect = document.getElementById('channel');

      // Clear existing options
      channelSelect.innerHTML = '';

      if (country === 'us') {
         // US video channels
         const channels = [{
               value: 'UCiFHCVp1YSy4sPye1v1yhDQ',
               text: 'MSNBC'
            },
            {
               value: 'UCXIJgqnII2ZOINSWNOGFThA',
               text: 'Fox News'
            },
            {
               value: 'UCZnUrseYETgW0e73AbqI7jQ',
               text: 'Newsweek'
            },
         ];

         // Add options to channel select
         channels.forEach(channel => {
            const option = document.createElement('option');
            option.value = channel.value;
            option.textContent = channel.text;
            channelSelect.appendChild(option);
         });
      } else if (country === 'gb') {
         // UK video channels
         const channels = [{
               value: 'UC16niRr50-MSBwiO3YDb3RA',
               text: 'BBC News'
            },
            {
               value: 'UCN1o_DQfpcNyahmOmQs1cYw',
               text: 'Daily Mail'
            }
         ];

         // Add options to channel select
         channels.forEach(channel => {
            const option = document.createElement('option');
            option.value = channel.value;
            option.textContent = channel.text;
            channelSelect.appendChild(option);
         });
      }
   }
}