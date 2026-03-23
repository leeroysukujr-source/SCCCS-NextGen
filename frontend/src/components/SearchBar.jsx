import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FiSearch, FiX, FiHash, FiBook, FiFile, FiMessageSquare } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import './SearchBar.css'

const searchAPI = {
  search: async (query, type) => {
    const token = localStorage.getItem('token')
    const params = new URLSearchParams({ q: query })
    if (type) params.append('type', type)
    
    const response = await fetch(`/api/search?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    if (!response.ok) throw new Error('Search failed')
    return response.json()
  }
}

export default function SearchBar({ onClose }) {
  const [query, setQuery] = useState('')
  const [selectedType, setSelectedType] = useState('')
  const navigate = useNavigate()
  
  const { data: results, isLoading } = useQuery({
    queryKey: ['search', query, selectedType],
    queryFn: () => searchAPI.search(query, selectedType),
    enabled: query.length >= 2
  })
  
  const handleResultClick = (result) => {
    if (result.type === 'channel') {
      navigate(`/chat/${result.id}`)
    } else if (result.type === 'class') {
      navigate(`/classes/${result.id}`)
    }
    if (onClose) onClose()
  }
  
  const getIcon = (type) => {
    switch (type) {
      case 'channel': return <FiHash />
      case 'class': return <FiBook />
      case 'file': return <FiFile />
      case 'message': return <FiMessageSquare />
      default: return <FiSearch />
    }
  }
  
  return (
    <div className="search-bar-overlay" onClick={onClose}>
      <div className="search-bar-container" onClick={(e) => e.stopPropagation()}>
        <div className="search-bar-header">
          <div className="search-input-wrapper">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search everything..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
              className="search-input"
            />
            {query && (
              <button onClick={() => setQuery('')} className="clear-search">
                <FiX />
              </button>
            )}
          </div>
          <div className="search-filters">
            <button
              className={selectedType === '' ? 'active' : ''}
              onClick={() => setSelectedType('')}
            >
              All
            </button>
            <button
              className={selectedType === 'channel' ? 'active' : ''}
              onClick={() => setSelectedType('channel')}
            >
              Channels
            </button>
            <button
              className={selectedType === 'class' ? 'active' : ''}
              onClick={() => setSelectedType('class')}
            >
              Classes
            </button>
            <button
              className={selectedType === 'file' ? 'active' : ''}
              onClick={() => setSelectedType('file')}
            >
              Files
            </button>
          </div>
        </div>
        
        <div className="search-results">
          {isLoading && <div className="search-loading">Searching...</div>}
          {results && results.results.length === 0 && query.length >= 2 && (
            <div className="search-empty">No results found</div>
          )}
          {results && results.results.length > 0 && (
            <div className="results-list">
              {results.results.map((result, index) => (
                <div
                  key={`${result.type}-${result.id}-${index}`}
                  className="result-item"
                  onClick={() => handleResultClick(result)}
                >
                  <div className="result-icon">{getIcon(result.type)}</div>
                  <div className="result-content">
                    <div className="result-title">{result.title}</div>
                    <div className="result-description">{result.description}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

