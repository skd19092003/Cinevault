// Modern Movie App - CineVault
// This file contains the core logic for the CineVault movie application.
// It handles API requests, state management, and DOM manipulation.
/**
 * The main class for the CineVault application.
 * Encapsulates all functionality related to the movie app.
 */
class MovieApp {
    /**
     * Initializes the application by setting up API keys, base URLs,
     * and initial state variables. It also binds event listeners and
     * loads initial data.
     */
    constructor() {
        // --- API Configuration ---
        this.API_KEY = '04c35731a5ee918f014970082a0088b1'; // The Movie Database (TMDB) API key
        this.BASE_URL = 'https://api.themoviedb.org/3'; // Base URL for all TMDB API requests
        this.IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500'; // Base URL for movie posters
        this.BACKDROP_BASE_URL = 'https://image.tmdb.org/t/p/w1280'; // Base URL for backdrop images

        
        // --- Application State ---
        this.currentPage = 'discover'; // The currently active page (e.g., 'discover', 'watchlist')
        this.currentQuery = ''; // The current search query
        this.currentGenre = ''; // The selected genre filter
        this.currentYear = ''; // The selected year filter
        this.currentSort = 'popularity.desc'; // The current sorting option

        this.apiPage = 1;
        this.totalPages = 1;
        
        // --- Local Storage Configuration ---
        // Keys used to store user data (watchlist, favorites, etc.) in the browser's local storage.
        this.STORAGE_KEYS = {
            watchlist: 'cinevault_watchlist',
            watched: 'cinevault_watched',
            favorites: 'cinevault_favorites',
            theme: 'cinevault_theme'
        };
        
        // --- Initialization ---
        // The init method kicks off the application setup.
        this.init();
    }
    
    /**
     * The main initialization method.
     * Sets up all necessary parts of the application on startup.
     */
    init() {
        this.setupEventListeners();
        this.loadGenres();
        this.loadYears();
        this.loadTheme();
        this.updateBadges();
        this.loadPopularMovies();
    }
    
    /**
     * Sets up all event listeners for user interactions, such as navigation clicks,
     * search input, and filter changes. This keeps the UI interactive.
     */
    setupEventListeners() {
        // Navigation
        document.querySelectorAll('[data-page]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchPage(e.target.closest('[data-page]').dataset.page);
            });
        });
        
        // Search
        const searchInput = document.getElementById('search');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce((e) => {
                this.currentQuery = e.target.value;
                this.apiPage = 1;
                this.searchMovies();
            }, 500));
        }
        
        // Filters
        const genreFilter = document.getElementById('genre-filter');
        if (genreFilter) {
            genreFilter.addEventListener('change', (e) => {
                this.currentGenre = e.target.value;
                this.apiPage = 1;
                this.searchMovies();
            });
        }
        
        const yearFilter = document.getElementById('year-filter');
        if (yearFilter) {
            yearFilter.addEventListener('change', (e) => {
                this.currentYear = e.target.value;
                this.apiPage = 1;
                this.searchMovies();
            });
        }
        
        const sortFilter = document.getElementById('sort-filter');
        if (sortFilter) {
            sortFilter.addEventListener('change', (e) => {
                this.currentSort = e.target.value;
                this.apiPage = 1;
                this.searchMovies();
            });
        }
        
        // Theme toggle
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }
        
        // Reset filters button
        const resetFiltersBtn = document.getElementById('reset-filters');
        if (resetFiltersBtn) {
            resetFiltersBtn.addEventListener('click', () => this.resetFilters());
        }
    }
    
    /**
     * Debounce function: A performance optimization technique.
     * It limits the rate at which a function gets called. In this app, it's used on the
     * search input to prevent firing an API request for every single keystroke. Instead,
     * it waits until the user has stopped typing for a specified time (e.g., 500ms).
     * @param {Function} func - The function to debounce.
     * @param {number} wait - The delay in milliseconds.
     * @returns {Function} - The debounced function.
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    /**
     * Asynchronously loads the list of movie genres from the TMDB API
     * and populates the genre filter dropdown menu.
     */
    async loadGenres() {
        try {
            const response = await fetch(`${this.BASE_URL}/genre/movie/list?api_key=${this.API_KEY}`);
            const data = await response.json();
            
            const genreSelect = document.getElementById('genre-filter');
            if (genreSelect && data.genres) {
                data.genres.forEach(genre => {
                    const option = document.createElement('option');
                    option.value = genre.id;
                    option.textContent = genre.name;
                    genreSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading genres:', error);
        }
    }
    
    /**
     * Populates the year filter dropdown with a range of years,
     * from the current year down to 1900.
     */
    loadYears() {
        const yearSelect = document.getElementById('year-filter');
        if (yearSelect) {
            const currentYear = new Date().getFullYear();
            for (let year = currentYear; year >= 1900; year--) {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                yearSelect.appendChild(option);
            }
        }
    }
    
    /**
     * Fetches the most popular movies from the TMDB API for the current page
     * and displays them on the discover page. This is the default view when the app loads.
     */
    async loadPopularMovies() {
        this.showLoading(true);
        try {
            // Limit to 500 movies total (25 pages with 20 movies each)
            const maxMovies = 500;
            const moviesPerPage = 20;
            const maxPages = Math.min(25, Math.ceil(maxMovies / moviesPerPage));
            
            // Adjust current page if it exceeds the limit
            if (this.apiPage > maxPages) {
                this.apiPage = maxPages;
            }
            
            const response = await fetch(`${this.BASE_URL}/movie/popular?api_key=${this.API_KEY}&page=${this.apiPage}`);
            const data = await response.json();
            
            // Limit results to our maximum per page
            const limitedResults = data.results.slice(0, moviesPerPage);
            this.totalPages = maxPages; // Use our calculated max pages
            
            this.displayMovies(limitedResults);
        } catch (error) {
            console.error('Error loading popular movies:', error);
        } finally {
            this.showLoading(false);
        }
    }
    
    /**
     * Fetches movies from the TMDB API based on the current search query, genre,
     * year, and sort filters. It handles both search and discovery endpoints.
     */
    async searchMovies() {
        this.showLoading(true);
        
        try {
            let url;
            
            if (this.currentQuery) {
                // For text searches, we need to filter by year after getting results
                url = `${this.BASE_URL}/search/movie?api_key=${this.API_KEY}&query=${encodeURIComponent(this.currentQuery)}&page=${this.apiPage}`;
                
                const response = await fetch(url);
                const data = await response.json();
                
                // Filter results by year if year filter is applied
                let filteredResults = data.results;
                if (this.currentYear) {
                    filteredResults = filteredResults.filter(movie => {
                        const releaseYear = movie.release_date ? movie.release_date.substring(0, 4) : '';
                        return releaseYear === this.currentYear.toString();
                    });
                }
                
                // Apply genre filter if specified
                if (this.currentGenre) {
                    filteredResults = filteredResults.filter(movie => 
                        movie.genre_ids && movie.genre_ids.includes(parseInt(this.currentGenre))
                    );
                }
                
                // Sort results if needed
                if (this.currentSort === 'release_date.desc') {
                    filteredResults.sort((a, b) => new Date(b.release_date) - new Date(a.release_date));
                } else if (this.currentSort === 'vote_average.desc') {
                    filteredResults.sort((a, b) => b.vote_average - a.vote_average);
                }
                
                // Apply pagination
                const startIdx = (this.apiPage - 1) * 20;
                const paginatedResults = filteredResults.slice(startIdx, startIdx + 20);
                
                this.totalPages = Math.ceil(filteredResults.length / 20);
                this.displayMovies(paginatedResults);
            } else {
                // For discover view with filters
                url = `${this.BASE_URL}/discover/movie?api_key=${this.API_KEY}&sort_by=${this.currentSort}&page=${this.apiPage}`;
                
                // Add filters
                if (this.currentGenre) {
                    url += `&with_genres=${this.currentGenre}`;
                }
                
                if (this.currentYear) {
                    // Use primary_release_year for more accurate filtering
                    url += `&primary_release_year=${this.currentYear}`;
                }
                
                const response = await fetch(url);
                const data = await response.json();
                
                // Limit to 20 movies per page
                const limitedResults = data.results.slice(0, 20);
                // Calculate total pages based on our 500 movie limit
                const totalResults = Math.min(500, data.total_results);
                this.totalPages = Math.min(25, Math.ceil(totalResults / 20));
                
                this.displayMovies(limitedResults);
            }
        } catch (error) {
            console.error('Error searching movies:', error);
        } finally {
            this.showLoading(false);
        }
    }
    
    /**
     * Renders a list of movies to the DOM.
     * It clears the existing movie grid and populates it with new movie cards.
     * If no movies are found, it displays a message to the user.
     * @param {Array} movies - An array of movie objects to display.
     */
    displayMovies(movies) {
        const movieBox = document.getElementById('movie-box');
        if (!movieBox) return;
        
        movieBox.innerHTML = '';
        
        if (!movies || movies.length === 0) {
            movieBox.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="fas fa-film fa-3x text-muted mb-3"></i>
                    <h4 class="text-muted">No movies found</h4>
                    <p class="text-muted">Try adjusting your search or filter criteria</p>
                </div>
            `;
            return;
        }
        
        // Use requestAnimationFrame for better performance on mobile
        requestAnimationFrame(() => {
            movies.forEach(movie => {
                const movieCard = this.createMovieCard(movie);
                movieBox.appendChild(movieCard);
            });
        });

        this.displayPagination();
    }
    
    /**
     * Creates the HTML structure for a single movie card.
     * This includes the movie poster, title, rating, year, and action buttons.
     * @param {Object} movie - The movie object from the API.
     * @returns {HTMLElement} - The movie card element.
     */
    createMovieCard(movie) {
        const card = document.createElement('div');
        card.className = 'movie-card';

        const posterUrl = movie.poster_path 
            ? `${this.IMAGE_BASE_URL}${movie.poster_path}`
            : 'https://via.placeholder.com/100x100/1e293b/cbd5e1?text=No+Image';

        const releaseYear = movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A';
        const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';

        // Button text toggles
        const isWatchlist = this.isMovieStored(this.STORAGE_KEYS.watchlist, movie.id);
        const isFavorite = this.isMovieStored(this.STORAGE_KEYS.favorites, movie.id);
        const isWatched = this.isMovieStored(this.STORAGE_KEYS.watched, movie.id);

        card.innerHTML = `
            <div class="movie-poster-container">
                <img src="${posterUrl}" alt="${movie.title}" class="movie-poster" loading="lazy">
            </div>
            <div class="movie-info">
                <h3 class="movie-title">${movie.title}</h3>
                <div class="movie-meta">
                    <div class="rating">
                        <i class="fas fa-star"></i>
                        <span>${rating}/10</span>
                    </div>
                    <span class="movie-year">${releaseYear}</span>
                </div>
                <p class="movie-overview">${movie.overview || 'No description available.'}</p>
                <div class="movie-actions">
                    <button class="action-btn details" onclick="movieApp.showMovieDetails(${movie.id})">
                        <i class="fas fa-info-circle"></i>
                        Details
                    </button>
                    <button class="action-btn watchlist" onclick="movieApp.toggleWatchlistAndRefresh(${movie.id})">
                        <i class="fas fa-clock"></i>
                        ${isWatchlist ? "Remove from Watch Later" : "Add to Watch Later"}
                    </button>
                    <button class="action-btn favorite" onclick="movieApp.toggleFavoriteAndRefresh(${movie.id})">
                        <i class="fas fa-heart"></i>
                        ${isFavorite ? "Remove from Favorites" : "Add to Favorites"}
                    </button>
                    <button class="action-btn watched" onclick="movieApp.toggleWatchedAndRefresh(${movie.id})">
                        <i class="fas fa-check-circle"></i>
                        ${isWatched ? "Remove from Watched" : "Add to Watched"}
                    </button>
                    <button class="action-btn trailer" onclick="movieApp.openTrailer(${movie.id})">
                        <i class="fas fa-play"></i>
                        Watch Trailer
                    </button>
                </div>
            </div>
        `;
        
        return card;
    }
    
    /**
     * Fetches detailed information for a specific movie and displays it in a modal window.
     * The modal includes more details like director, tagline, and an extended overview.
     * @param {number} movieId - The ID of the movie to show details for.
     */
    async showMovieDetails(movieId) {
        try {
            const response = await fetch(`${this.BASE_URL}/movie/${movieId}?api_key=${this.API_KEY}&append_to_response=credits,videos`);
            const providersResponse = await fetch(`${this.BASE_URL}/movie/${movieId}/watch/providers?api_key=${this.API_KEY}`);
            const providersData = await providersResponse.json();
            
            const movie = await response.json();

            const modal = document.getElementById('movieModal');
            const modalContent = document.getElementById('modal-content');

            if (!modal || !modalContent) return;

            const updateModalContent = () => {
                const isWatchlist = this.isMovieStored(this.STORAGE_KEYS.watchlist, movie.id);
                const isFavorite = this.isMovieStored(this.STORAGE_KEYS.favorites, movie.id);
                const isWatched = this.isMovieStored(this.STORAGE_KEYS.watched, movie.id);

                const director = movie.credits.crew.find(c => c.job === 'Director')?.name || 'N/A';
                const genres = movie.genres.map(g => g.name).join(', ') || 'N/A';
                const posterUrl = movie.poster_path ? `${this.IMAGE_BASE_URL}${movie.poster_path}` : 'https://via.placeholder.com/300x450/1e293b/cbd5e1?text=No+Image';

                modalContent.innerHTML = `
                    <div class="modal-header-grid">
                        <img src="${posterUrl}" alt="${movie.title}" class="modal-poster">
                        <div class="modal-title-section">
                            <h2 class="modal-title">${movie.title} (${movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A'})</h2>
                            <p class="modal-tagline">${movie.tagline || ''}</p>
                            <div class="modal-meta">
                                <span><i class="fas fa-film"></i> ${genres}</span>
                                <span><i class="fas fa-user-tie"></i> Director: ${director}</span>
                                <span><i class="fas fa-star"></i> ${movie.vote_average.toFixed(1)}/10</span>
                            </div>
                        </div>
                    </div>
                    <div class="modal-body-section">
                        <h4>Overview</h4>
                        <p>${movie.overview}</p>
                        ${this.renderWatchProvidersSection(providersData.results)}
                        <div class="modal-actions">
                            <button class="action-btn watchlist" id="modal-watchlist-btn"><i class="fas fa-clock"></i> ${isWatchlist ? "Remove from Watch Later" : "Add to Watch Later"}</button>
                            <button class="action-btn favorite" id="modal-favorite-btn"><i class="fas fa-heart"></i> ${isFavorite ? "Remove from Favorites" : "Add to Favorites"}</button>
                            <button class="action-btn watched" id="modal-watched-btn"><i class="fas fa-check-circle"></i> ${isWatched ? "Remove from Watched" : "Add to Watched"}</button>
                            <button class="action-btn trailer" onclick="movieApp.openTrailer(${movie.id})"><i class="fas fa-play"></i> Watch Trailer</button>
                        </div>
                    </div>
                `;

                // Re-attach event listeners
                document.getElementById('modal-watchlist-btn').addEventListener('click', async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    await this.toggleWatchlist(movie.id);
                    this.refreshCurrentMovies();
                    updateModalContent();
                });
                document.getElementById('modal-favorite-btn').addEventListener('click', async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    await this.toggleFavorite(movie.id);
                    this.refreshCurrentMovies();
                    updateModalContent();
                });
                document.getElementById('modal-watched-btn').addEventListener('click', async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    await this.toggleWatched(movie.id);
                    this.refreshCurrentMovies();
                    updateModalContent();
                });
            };

            updateModalContent();

            const bootstrapModal = new bootstrap.Modal(modal);
            if (!modal.classList.contains('show')) {
                bootstrapModal.show();
            }

        } catch (error) {
            console.error('Error loading movie details:', error);
        }
    }
    
    /**
     * Handles navigation between different pages of the application (e.g., Discover, Watchlist).
     * It updates the active navigation link and shows/hides the relevant page content.
     * @param {string} page - The name of the page to switch to.
     */
    switchPage(page) {
        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-page="${page}"]`).classList.add('active');
        
        // Hide all pages
        document.querySelectorAll('.page-content').forEach(pageContent => {
            pageContent.classList.add('hidden');
        });
        
        // Show selected page
        const targetPage = document.getElementById(`${page}-page`);
        if (targetPage) {
            targetPage.classList.remove('hidden');
        }
        
        this.currentPage = page;
        
        // Load content based on page
        switch (page) {
            case 'discover':
                if (this.currentQuery || this.currentGenre || this.currentYear) {
                    this.searchMovies();
                } else {
                    this.loadPopularMovies();
                }
                break;
            case 'watchlist':
                this.loadWatchlistMovies();
                break;
            case 'watched':
                this.loadWatchedMovies();
                break;
            case 'favorites':
                this.loadFavoriteMovies();
                break;
        }
    }
    
    // --- Local Storage Methods ---
    // These methods handle the logic for storing and retrieving user data (watchlist, favorites, etc.)
    // from the browser's local storage, allowing data to persist between sessions.
    /**
     * Retrieves a list of movies from local storage for a given key.
     * @param {string} key - The local storage key (e.g., 'cinevault_watchlist').
     * @returns {Array} - An array of movie objects.
     */
    getStoredMovies(key) {
        try {
            return JSON.parse(localStorage.getItem(key)) || [];
        } catch {
            return [];
        }
    }
    
    /**
     * Stores a movie object in local storage under a specific key.
     * @param {string} key - The local storage key.
     * @param {Object} movie - The movie object to store.
     */
    storeMovie(key, movie) {
        const movies = this.getStoredMovies(key);
        if (!movies.find(m => m.id === movie.id)) {
            movies.push(movie);
            localStorage.setItem(key, JSON.stringify(movies));
        }
    }
    
    /**
     * Removes a movie from local storage by its ID.
     * @param {string} key - The local storage key.
     * @param {number} movieId - The ID of the movie to remove.
     */
    removeMovie(key, movieId) {
        const movies = this.getStoredMovies(key);
        const filtered = movies.filter(m => m.id !== movieId);
        localStorage.setItem(key, JSON.stringify(filtered));
    }
    
    /**
     * Checks if a movie with a given ID is already in local storage.
     * @param {string} key - The local storage key.
     * @param {number} movieId - The ID of the movie to check.
     * @returns {boolean} - True if the movie is stored, false otherwise.
     */
    isMovieStored(key, movieId) {
        const movies = this.getStoredMovies(key);
        return movies.some(m => m.id === movieId);
    }
    
    /**
     * Adds or removes a movie from the user's watchlist.
     * It fetches the movie details first to ensure the complete object is stored.
     * @param {number} movieId - The ID of the movie to toggle.
     */
    async toggleWatchlist(movieId) {
        try {
            const movie = await this.getMovieById(movieId);
            if (this.isMovieStored(this.STORAGE_KEYS.watchlist, movieId)) {
                this.removeMovie(this.STORAGE_KEYS.watchlist, movieId);
            } else {
                this.storeMovie(this.STORAGE_KEYS.watchlist, movie);
            }
            this.updateBadges();
        } catch (error) {
            console.error('Error toggling watchlist:', error);
        }
    }
    
    async toggleWatched(movieId) {
        try {
            const movie = await this.getMovieById(movieId);
            if (this.isMovieStored(this.STORAGE_KEYS.watched, movieId)) {
                this.removeMovie(this.STORAGE_KEYS.watched, movieId);
            } else {
                this.storeMovie(this.STORAGE_KEYS.watched, movie);
                // Remove from watchlist if it exists
                this.removeMovie(this.STORAGE_KEYS.watchlist, movieId);
            }
            this.updateBadges();
        } catch (error) {
            console.error('Error toggling watched:', error);
        }
    }
    
    async toggleFavorite(movieId) {
        try {
            const movie = await this.getMovieById(movieId);
            if (this.isMovieStored(this.STORAGE_KEYS.favorites, movieId)) {
                this.removeMovie(this.STORAGE_KEYS.favorites, movieId);
            } else {
                this.storeMovie(this.STORAGE_KEYS.favorites, movie);
            }
            this.updateBadges();
        } catch (error) {
            console.error('Error toggling favorite:', error);
        }
    }
    
    async getMovieById(movieId) {
        const response = await fetch(`${this.BASE_URL}/movie/${movieId}?api_key=${this.API_KEY}`);
        return await response.json();
    }
    
    updateBadges() {
        const watchlistCount = this.getStoredMovies(this.STORAGE_KEYS.watchlist).length;
        const watchedCount = this.getStoredMovies(this.STORAGE_KEYS.watched).length;
        const favoritesCount = this.getStoredMovies(this.STORAGE_KEYS.favorites).length;
        
        const watchlistBadge = document.getElementById('watchlist-count');
        const watchedBadge = document.getElementById('watched-count');
        const favoritesBadge = document.getElementById('favorites-count');
        
        if (watchlistBadge) watchlistBadge.textContent = watchlistCount;
        if (watchedBadge) watchedBadge.textContent = watchedCount;
        if (favoritesBadge) favoritesBadge.textContent = favoritesCount;
    }
    
    loadWatchlistMovies() {
        const movies = this.getStoredMovies(this.STORAGE_KEYS.watchlist);
        const container = document.getElementById('watchlist-movies');
        if (container) {
            this.displayStoredMovies(movies, container);
        }
    }
    
    loadWatchedMovies() {
        const movies = this.getStoredMovies(this.STORAGE_KEYS.watched);
        const container = document.getElementById('watched-movies');
        if (container) {
            this.displayStoredMovies(movies, container);
        }
    }
    
    loadFavoriteMovies() {
        const movies = this.getStoredMovies(this.STORAGE_KEYS.favorites);
        const container = document.getElementById('favorite-movies');
        if (container) {
            this.displayStoredMovies(movies, container);
        }
    }
    
    displayStoredMovies(movies, container) {
        container.className = 'movie-grid';
        container.innerHTML = '';
        
        if (!movies || movies.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="fas fa-film fa-3x text-muted mb-3"></i>
                    <h4 class="text-muted">No movies found</h4>
                    <p class="text-muted">Start adding movies to see them here</p>
                </div>
            `;
            return;
        }
        
        // Use requestAnimationFrame for better performance on mobile
        requestAnimationFrame(() => {
            movies.forEach(movie => {
                const movieCard = this.createMovieCard(movie);
                container.appendChild(movieCard);
            });
        });
    }
    
    showLoading(show) {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.classList.toggle('hidden', !show);
        }
    }
    
    // Helper methods for UI refresh and actions
    updateMovieButtonStates(movieId, buttonType = null) {
        // Store scroll position
        const scrollPosition = window.scrollY || document.documentElement.scrollTop;
        
        // Only remove card if we're in the matching section and it's a remove action
        if (buttonType && 
            ((this.currentPage === 'watchlist' && buttonType === 'watchlist') ||
             (this.currentPage === 'watched' && buttonType === 'watched') ||
             (this.currentPage === 'favorites' && buttonType === 'favorites'))) {
            
            // Find and remove the card with fade effect
            const cards = document.querySelectorAll('.movie-card');
            cards.forEach(card => {
                // Make sure we're targeting the correct button type
                let button;
                if (buttonType === 'watchlist') {
                    button = card.querySelector(`button[onclick*="toggleWatchlistAndRefresh(${movieId}"]`);
                } else if (buttonType === 'watched') {
                    button = card.querySelector(`button[onclick*="toggleWatchedAndRefresh(${movieId}"]`);
                } else if (buttonType === 'favorites') {
                    button = card.querySelector(`button[onclick*="toggleFavoriteAndRefresh(${movieId}"]`);
                }
        
                if (button) {
                    card.style.transition = 'opacity 0.2s';
                    card.style.opacity = '0';
                    setTimeout(() => {
                        card.remove();
                        // Show empty state if no cards left
                        if (document.querySelectorAll('.movie-card').length === 0) {
                            this.showEmptyState();
                        }
                    }, 200);
                }
            });
        } 
        // For discover page or when not removing from current section
        else {
            // Just update button text
            const buttons = document.querySelectorAll(`
                button[onclick*="toggleWatchlistAndRefresh(${movieId})"],
                button[onclick*="toggleFavoriteAndRefresh(${movieId})"],
                button[onclick*="toggleWatchedAndRefresh(${movieId})"]
            `);
            
            buttons.forEach(button => {
                const isWatchlist = button.onclick.toString().includes('toggleWatchlistAndRefresh');
                const isFavorite = button.onclick.toString().includes('toggleFavoriteAndRefresh');
                const isWatched = button.onclick.toString().includes('toggleWatchedAndRefresh');
                
                if (isWatchlist) {
                    const isInList = this.isMovieStored(this.STORAGE_KEYS.watchlist, movieId);
                    button.innerHTML = `<i class="fas fa-clock"></i> ${isInList ? 'Remove from' : 'Add to'} Watch Later`;
                }
                else if (isFavorite) {
                    const isInList = this.isMovieStored(this.STORAGE_KEYS.favorites, movieId);
                    button.innerHTML = `<i class="fas fa-heart"></i> ${isInList ? 'Remove from' : 'Add to'} Favorites`;
                }
                else if (isWatched) {
                    const isInList = this.isMovieStored(this.STORAGE_KEYS.watched, movieId);
                    button.innerHTML = `<i class="fas fa-check-circle"></i> ${isInList ? 'Remove from' : 'Add to'} Watched`;
                }
            });
        }
        
        // Update badges
        this.updateBadges();
        
        // Restore scroll position
        window.scrollTo(0, scrollPosition);
    }
    
    // Update the toggle methods to pass the button type
    async toggleWatchlistAndRefresh(movieId) {
        const wasInList = this.isMovieStored(this.STORAGE_KEYS.watchlist, movieId);
        await this.toggleWatchlist(movieId);
        this.updateMovieButtonStates(movieId, wasInList ? 'watchlist' : null);
    }
    
    async toggleFavoriteAndRefresh(movieId) {
        const wasInList = this.isMovieStored(this.STORAGE_KEYS.favorites, movieId);
        await this.toggleFavorite(movieId);
        this.updateMovieButtonStates(movieId, wasInList ? 'favorites' : null);
    }
    
    async toggleWatchedAndRefresh(movieId) {
        const wasInList = this.isMovieStored(this.STORAGE_KEYS.watched, movieId);
        await this.toggleWatched(movieId);
        this.updateMovieButtonStates(movieId, wasInList ? 'watched' : null);
    }
    
    // Add this helper method
    showEmptyState() {
        const container = document.querySelector('.movie-grid') || document.getElementById('movie-box');
        if (container) {
            container.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="fas fa-film fa-3x text-muted mb-3"></i>
                    <h4 class="text-muted">No movies and series found</h4>
                    <p class="text-muted">Start adding movies and series to see them here</p>
                </div>
            `;
        }
    }
    async openTrailer(movieId) {
        try {
            const response = await fetch(`${this.BASE_URL}/movie/${movieId}/videos?api_key=${this.API_KEY}`);
            const data = await response.json();
            if (data.results && data.results.length > 0) {
                const trailer = data.results.find(v => v.site === 'YouTube' && v.type === 'Trailer') || data.results.find(v => v.site === 'YouTube');
                if (trailer) {
                    window.open(`https://www.youtube.com/watch?v=${trailer.key}`, '_blank');
                    return;
                }
            }
            alert('Trailer not available for this movie.');
        } catch (e) {
            alert('Trailer not available for this movie.');
        }
    }

    async refreshCurrentMovies() {
        switch (this.currentPage) {
            case 'discover':
                if (this.currentQuery || this.currentGenre || this.currentYear) {
                    await this.searchMovies();
                } else {
                    await this.loadPopularMovies();
                }
                break;
            case 'watchlist':
                this.loadWatchlistMovies();
                break;
            case 'watched':
                this.loadWatchedMovies();
                break;
            case 'favorites':
                this.loadFavoriteMovies();
                break;
        }
    }

    /**
     * Resets all filters to their default values and refreshes the movie list
     */
    resetFilters() {
        // Reset filter values
        this.currentQuery = '';
        this.currentGenre = '';
        this.currentYear = '';
        this.currentSort = 'popularity.desc';
        this.apiPage = 1;
        
        // Update UI elements
        const searchInput = document.getElementById('search');
        const genreFilter = document.getElementById('genre-filter');
        const yearFilter = document.getElementById('year-filter');
        const sortFilter = document.getElementById('sort-filter');
        
        if (searchInput) searchInput.value = '';
        if (genreFilter) genreFilter.value = '';
        if (yearFilter) yearFilter.value = '';
        if (sortFilter) sortFilter.value = 'popularity.desc';
        
        // Refresh the movie list
        this.searchMovies();
    }
    
    // Theme Management
    loadTheme() {
        const savedTheme = localStorage.getItem(this.STORAGE_KEYS.theme) || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.updateThemeIcon(savedTheme);
    }
    
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem(this.STORAGE_KEYS.theme, newTheme);
        this.updateThemeIcon(newTheme);
    }
    
    updateThemeIcon(theme) {
        const themeIcon = document.querySelector('#theme-toggle i');
        if (themeIcon) {
            themeIcon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    }

    /**
     * Navigates to a specific page of movie results.
     * It updates the API page number and re-fetches the movies for the current view.
     * @param {number} page - The page number to navigate to.
     */
    goToPage(page) {
        // Ensure page doesn't exceed our limits
        const maxPages = 7; // 100 movies / 15 per page = 7 pages max
        if (page > maxPages) {
            page = maxPages;
        } else if (page < 1) {
            page = 1;
        }
        
        this.apiPage = page;
        if (this.currentPage === 'discover') {
            if (this.currentQuery || this.currentGenre || this.currentYear) {
                this.searchMovies();
            } else {
                this.loadPopularMovies();
            }
        }
        document.querySelector('.container').scrollIntoView({ behavior: 'smooth' });
    }

    /**
     * Renders the pagination controls at the bottom of the movie grid.
     * It dynamically creates the page links based on the total number of pages
     * available from the API. It includes 'Previous' and 'Next' buttons and
     * intelligently shows a limited number of page links to avoid clutter.
     */
    displayPagination() {
        const paginationContainer = document.getElementById('pagination-container');
        if (!paginationContainer) return;

        paginationContainer.innerHTML = '';
        if (this.totalPages <= 1) return;

        const isMobile = window.innerWidth <= 480;
        const maxPagesToShow = isMobile ? 3 : 5;
        let startPage, endPage;

        if (this.totalPages <= maxPagesToShow) {
            startPage = 1;
            endPage = this.totalPages;
        } else {
            const maxPagesBeforeCurrent = Math.floor(maxPagesToShow / 2);
            const maxPagesAfterCurrent = Math.ceil(maxPagesToShow / 2) - 1;
            
            if (this.apiPage <= maxPagesBeforeCurrent) {
                startPage = 1;
                endPage = maxPagesToShow;
            } else if (this.apiPage + maxPagesAfterCurrent >= this.totalPages) {
                startPage = this.totalPages - maxPagesToShow + 1;
                endPage = this.totalPages;
            } else {
                startPage = this.apiPage - maxPagesBeforeCurrent;
                endPage = this.apiPage + maxPagesAfterCurrent;
            }
        }

        const paginationItems = [];
        
        // Previous button
        paginationItems.push(`
            <li class="page-item ${this.apiPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="event.preventDefault(); movieApp.goToPage(${this.apiPage - 1})" 
                   aria-label="Previous">
                    <span aria-hidden="true">&laquo;</span>
                </a>
            </li>
        `);

        // First page
        if (startPage > 1) {
            paginationItems.push(`
                <li class="page-item">
                    <a class="page-link" href="#" onclick="event.preventDefault(); movieApp.goToPage(1)">1</a>
                </li>
            `);
            
            if (startPage > 2) {
                paginationItems.push('<li class="page-item disabled"><span class="page-link">...</span></li>');
            }
        }

        // Page numbers
        for (let i = startPage; i <= endPage; i++) {
            paginationItems.push(`
                <li class="page-item ${this.apiPage === i ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="event.preventDefault(); movieApp.goToPage(${i})">${i}</a>
                </li>
            `);
        }

        // Last page
        if (endPage < this.totalPages) {
            if (endPage < this.totalPages - 1) {
                paginationItems.push('<li class="page-item disabled"><span class="page-link">...</span></li>');
            }
            
            paginationItems.push(`
                <li class="page-item">
                    <a class="page-link" href="#" onclick="event.preventDefault(); movieApp.goToPage(${this.totalPages})">
                        ${this.totalPages}
                    </a>
                </li>
            `);
        }

        // Next button
        paginationItems.push(`
            <li class="page-item ${this.apiPage === this.totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="event.preventDefault(); movieApp.goToPage(${this.apiPage + 1})" 
                   aria-label="Next">
                    <span aria-hidden="true">&raquo;</span>
                </a>
            </li>
        `);

        // Create pagination HTML
        const paginationHTML = `
            <ul class="pagination">
                ${paginationItems.join('')}
            </ul>
        `;

        paginationContainer.innerHTML = paginationHTML;
    }
    
    /**
     * Renders watch provider section for a movie
     * @param {Object} providersByCountry - Object containing providers by country code
     * @returns {string} HTML string for providers section
     */
    renderWatchProvidersSection(providersByCountry) {
        if (!providersByCountry || Object.keys(providersByCountry).length === 0) {
            return '';
        }
        
        // Prioritize providers for India, then US, then first available country
        const priorityCountries = ['IN', 'US'];
        let selectedProviders = null;
        
        for (const country of priorityCountries) {
            if (providersByCountry[country]) {
                selectedProviders = providersByCountry[country];
                break;
            }
        }
        
        // If no priority country found, use first available
        if (!selectedProviders) {
            const firstCountry = Object.keys(providersByCountry)[0];
            selectedProviders = providersByCountry[firstCountry];
        }
        
        // Combine all provider types
        const allProviders = [
            ...(selectedProviders.flatrate || []),
            ...(selectedProviders.buy || []),
            ...(selectedProviders.rent || [])
        ];
        
        // Remove duplicates and filter for major streaming services
        const uniqueProviders = [...new Map(allProviders.map(p => [p.provider_id, p])).values()];
        const majorProviders = uniqueProviders.filter(provider => {
            const majorServices = [
                'Netflix', 'Amazon Prime Video', 'Amazon Video', 'Prime Video', 'Hotstar',
                'Disney+', 'HBO Max', 'Apple TV+', 'Paramount+', 'Peacock', 'JioCinema',
                'SonyLIV', 'Zee5', 'MX Player', 'Eros Now', 'AltBalaji', 'Voot'
            ];
            return majorServices.some(service =>
                provider.provider_name.toLowerCase().includes(service.toLowerCase())
            );
        });
        
        if (majorProviders.length === 0) {
            return '';
        }
        
        const providersHTML = majorProviders.map(provider => `
            <div class="provider-item" title="${provider.provider_name}">
                <i class="fas fa-play-circle"></i>
                <span>${provider.provider_name}</span>
            </div>
        `).join('');
        
        return `
            <div class="watch-providers-section">
                <h4>Available On</h4>
                <div class="providers-grid">
                    ${providersHTML}
                </div>
            </div>
        `;
    }
}

// Initialize the app
const movieApp = new MovieApp();

// Ensure helper methods are accessible globally for inline onclick handlers
window.movieApp = movieApp;
window.movieApp.toggleWatchlistAndRefresh = movieApp.toggleWatchlistAndRefresh.bind(movieApp);
window.movieApp.toggleFavoriteAndRefresh = movieApp.toggleFavoriteAndRefresh.bind(movieApp);
window.movieApp.toggleWatchedAndRefresh = movieApp.toggleWatchedAndRefresh.bind(movieApp);
window.movieApp.openTrailer = movieApp.openTrailer.bind(movieApp);

// Demo message for API key
if (movieApp.API_KEY === 'YOUR_TMDB_API_KEY') {
    console.warn('Please replace YOUR_TMDB_API_KEY with your actual TMDB API key in js/modern-app.js');
    
    // Show demo data for development
    setTimeout(() => {
        const demoMovies = [
            {
                id: 1,
                title: "War of the Worlds",
                overview: "Will Radford is a top cyber-security analyst for Homeland Security who tracks potential threats to national security through a mass surveillance program, until one day an attack by an unknown entity leads him to question whether the government is hiding something from him... and from the rest of the world.",
                poster_path: null,
                release_date: "2025-01-01",
                vote_average: 4.5
            },
            {
                id: 2,
                title: "How to Train Your Dragon",
                overview: "On the rugged isle of Berk, where Vikings and dragons have been bitter enemies for generations, Hiccup...",
                poster_path: null,
                release_date: "2025-01-01",
                vote_average: 8.0
            }
        ];
        
        movieApp.displayMovies(demoMovies);
    }, 1000);
}