import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { getFullImageUrl } from '../utils/api';
import { FiUser, FiSettings, FiLogOut, FiChevronDown, FiShield, FiMoon, FiSun } from 'react-icons/fi';
import './UserProfileDropdown.css';
import useTheme from '../hooks/useTheme';

const UserProfileDropdown = () => {
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const [theme, setTheme] = useTheme();

    const toggleDropdown = () => setIsOpen(!isOpen);

    const handleClickOutside = (event) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
            setIsOpen(false);
        }
    };

    useEffect(() => {
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const getInitials = () => {
        if (user?.first_name && user?.last_name) {
            return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
        }
        return (user?.username?.[0] || 'U').toUpperCase();
    };

    if (!user) return null;

    return (
        <div className="user-profile-dropdown" ref={dropdownRef}>
            <button className={`profile-trigger ${isOpen ? 'active' : ''}`} onClick={toggleDropdown}>
                <div className="avatar-wrapper">
                    {user.avatar_url ? (
                        <img 
                            src={getFullImageUrl(user.avatar_url)} 
                            alt={user.username} 
                            className="avatar-img"
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                            }}
                        />
                    ) : null}
                    <div className="avatar-initials" style={{ display: user.avatar_url ? 'none' : 'flex' }}>
                        {getInitials()}
                    </div>
                </div>
                <div className="user-info-brief">
                    <span className="user-name-text">{user.first_name || user.username}</span>
                    <FiChevronDown className={`chevron-icon ${isOpen ? 'rotate' : ''}`} />
                </div>
            </button>

            {isOpen && (
                <div className="dropdown-menu">
                    <div className="dropdown-header">
                        <p className="full-name">{user.first_name} {user.last_name}</p>
                        <p className="user-email">{user.email || user.username}</p>
                        <div className="user-role-badge">
                            <FiShield size={12} />
                            <span>{user.role?.replace('_', ' ')}</span>
                        </div>
                    </div>
                    
                    <div className="dropdown-divider"></div>
                    
                    <div className="dropdown-items">
                        <button onClick={() => { navigate('/profile'); setIsOpen(false); }}>
                            <FiUser />
                            <span>My Profile</span>
                        </button>
                        <button onClick={() => { navigate('/settings'); setIsOpen(false); }}>
                            <FiSettings />
                            <span>Settings</span>
                        </button>
                        <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                            {theme === 'dark' ? <FiSun /> : <FiMoon />}
                            <span>{theme === 'dark' ? 'Light' : 'Dark'} Mode</span>
                        </button>
                    </div>

                    <div className="dropdown-divider"></div>
                    
                    <div className="dropdown-footer">
                        <button className="logout-btn" onClick={handleLogout}>
                            <FiLogOut />
                            <span>Sign Out</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserProfileDropdown;
