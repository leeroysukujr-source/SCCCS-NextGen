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

    const toggleDropdown = (e) => {
        if (e) e.stopPropagation();
        setIsOpen(!isOpen);
    };

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
            <button 
                className={`profile-trigger ${isOpen ? 'active' : ''}`} 
                onClick={toggleDropdown}
                title="Account Settings"
            >
                <div className="avatar-circle">
                    {user.avatar_url ? (
                        <img 
                            src={getFullImageUrl(user.avatar_url)} 
                            alt={user.username} 
                            className="avatar-img"
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.style.display = 'none';
                            }}
                        />
                    ) : (
                        <div className="avatar-initials-circle">
                           {getInitials()}
                        </div>
                    )}
                </div>
                <div className="user-label-desktop">
                    <span className="user-display-name">{user.first_name || user.username}</span>
                    <FiChevronDown className={`chevron-icon ${isOpen ? 'rotate' : ''}`} />
                </div>
            </button>

            {isOpen && (
                <div className="dropdown-menu premium-menu">
                    <div className="dropdown-profile-header">
                        <div className="header-avatar">
                             {user.avatar_url ? (
                                <img src={getFullImageUrl(user.avatar_url)} alt="Avatar" />
                             ) : (
                                <div className="avatar-initials-large">{getInitials()}</div>
                             )}
                        </div>
                        <div className="header-info">
                            <h3 className="full-name">{user.first_name} {user.last_name}</h3>
                            <p className="user-email">{user.email || user.username}</p>
                            <span className={`role-tag role-${user.role}`}>
                                <FiShield size={10} />
                                {user.role?.replace('_', ' ')}
                            </span>
                        </div>
                    </div>
                    
                    <div className="dropdown-divider"></div>
                    
                    <div className="dropdown-items">
                        <button className="menu-item" onClick={() => { navigate('/profile'); setIsOpen(false); }}>
                            <div className="item-icon-bg"><FiUser /></div>
                            <div className="item-text">
                                <strong>My Profile</strong>
                                <span>Personal information & security</span>
                            </div>
                        </button>
                        <button className="menu-item" onClick={() => { navigate('/settings'); setIsOpen(false); }}>
                            <div className="item-icon-bg"><FiSettings /></div>
                            <div className="item-text">
                                <strong>Preferences</strong>
                                <span>System behavior & UI</span>
                            </div>
                        </button>
                        <button className="menu-item theme-switch" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                            <div className="item-icon-bg">{theme === 'dark' ? <FiSun /> : <FiMoon />}</div>
                            <div className="item-text">
                                <strong>{theme === 'dark' ? 'Light' : 'Dark'} Mode</strong>
                                <span>Switch visual theme</span>
                            </div>
                        </button>
                    </div>

                    <div className="dropdown-footer">
                        <button className="professional-logout-btn" onClick={handleLogout}>
                            <FiLogOut />
                            <span>Sign Out of Session</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserProfileDropdown;
