"use client";
import React, { useState, useEffect, useRef } from "react";
import { ChevronDown, Search } from "lucide-react";
import Image from "next/image";

const FloatingNavbar = ({ navItems, className = "" }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [searchTerms, setSearchTerms] = useState({});
  const dropdownRefs = useRef({});
  const inputRefs = useRef({});

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Show navbar when scrolling up, hide when scrolling down
      if (currentScrollY < lastScrollY || currentScrollY < 100) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (activeDropdown !== null) {
        const dropdownElement = dropdownRefs.current[activeDropdown];
        if (dropdownElement && !dropdownElement.contains(event.target)) {
          setActiveDropdown(null);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [activeDropdown]);

  const handleInputClick = (index, item) => {
    if (item.hasDropdown) {
      setActiveDropdown(activeDropdown === index ? null : index);
      // Focus the input when opening dropdown
      setTimeout(() => {
        if (inputRefs.current[index]) {
          inputRefs.current[index].focus();
        }
      }, 0);
    }
  };

  const handleSearchChange = (index, value) => {
    setSearchTerms(prev => ({
      ...prev,
      [index]: value
    }));
  };

  const handleInputFocus = (index) => {
    // Clear the selected value when user starts typing
    const item = navItems[index];
    if (item.selectedValue && !searchTerms[index]) {
      setSearchTerms(prev => ({
        ...prev,
        [index]: ""
      }));
    }
  };

  const getFilteredOptions = (item, index) => {
    if (!item.dropdownOptions) return [];
    const searchTerm = searchTerms[index] || "";
    if (!searchTerm) return item.dropdownOptions;
    
    return item.dropdownOptions.filter(option =>
      option.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const handleOptionSelect = (option, index) => {
    if (option.onClick) {
      option.onClick();
    }
    setActiveDropdown(null);
    setSearchTerms(prev => ({
      ...prev,
      [index]: ""
    }));
  };

        return (
          <nav
            className={`fixed left-1/2 top-4 z-50 flex max-w-fit -translate-x-1/2 items-center justify-center space-x-2 rounded-xl border border-white/10 bg-black/80 px-3 py-2 backdrop-blur shadow-[0_20px_45px_rgba(8,11,24,0.55)] transition-all duration-300 sm:space-x-3 sm:px-6 sm:py-3 sm:top-8 ${
              isVisible ? "translate-y-0 opacity-100" : "-translate-y-20 opacity-0"
            } ${className}`}
          >
      {navItems.map((item, index) => (
        <div
          key={index}
          ref={(el) => (dropdownRefs.current[index] = el)}
          className="relative"
        >
          {/* Platform Images Filter */}
          {item.name === "Platforms" && item.platformOptions ? (
            <div className="flex items-center space-x-2 rounded-lg border border-white/20 bg-white/5 px-2 py-1.5 sm:px-3 sm:py-2">
              <span className="text-xs text-neutral-400 sm:text-sm">{item.name}:</span>
              <div className="flex items-center space-x-1">
                {item.platformOptions.map((platform) => (
                  <button
                    key={platform.value}
                    onClick={() => platform.onClick()}
                    className={`flex h-6 w-6 items-center justify-center rounded-md transition-all duration-200 sm:h-7 sm:w-7 ${
                      platform.isActive
                        ? "bg-sky-500/20 ring-2 ring-sky-500/30"
                        : "hover:bg-white/10"
                    }`}
                    title={platform.label}
                  >
                    <Image
                      src={platform.imageSrc}
                      alt={platform.label}
                      width={16}
                      height={16}
                      className="h-3 w-3 sm:h-4 sm:w-4"
                    />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Regular Input Box */
            <div
              className={`flex items-center space-x-2 rounded-lg border px-2 py-1.5 text-xs transition-all duration-200 cursor-pointer min-w-[100px] sm:px-3 sm:py-2 sm:text-sm sm:min-w-[140px] ${
                activeDropdown === index
                  ? "border-sky-500/50 bg-sky-500/10 text-white"
                  : "border-white/20 bg-white/5 text-neutral-400 hover:border-white/30 hover:text-neutral-300"
              }`}
              onClick={() => handleInputClick(index, item)}
            >
              {item.icon && (
                <span className="flex h-3 w-3 items-center justify-center text-neutral-500 sm:h-4 sm:w-4">
                  {item.icon}
                </span>
              )}
              <input
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                placeholder={item.placeholder || item.name}
                value={searchTerms[index] || item.selectedValue || ""}
                onChange={(e) => handleSearchChange(index, e.target.value)}
                onFocus={() => handleInputFocus(index)}
                className="flex-1 bg-transparent outline-none placeholder-neutral-500 text-sm"
                readOnly={!item.hasDropdown}
              />
              {item.hasDropdown && (
                <ChevronDown 
                  className={`h-3 w-3 text-neutral-500 transition-transform duration-200 sm:h-4 sm:w-4 ${
                    activeDropdown === index ? "rotate-180" : ""
                  }`} 
                />
              )}
            </div>
          )}
          
          {/* Dropdown Menu */}
          {item.hasDropdown && activeDropdown === index && (
            <div className="absolute top-full left-0 mt-2 min-w-[200px] max-w-[300px] rounded-lg border border-white/10 bg-black/95 px-3 py-2 backdrop-blur shadow-lg z-50">
              {/* Search Input */}
              <div className="flex items-center space-x-2 mb-2 px-2 py-1 rounded-md bg-white/5">
                <Search className="h-4 w-4 text-neutral-500" />
                <input
                  type="text"
                  placeholder={`Search ${item.name.toLowerCase()}...`}
                  value={searchTerms[index] || ""}
                  onChange={(e) => handleSearchChange(index, e.target.value)}
                  className="flex-1 bg-transparent outline-none text-sm text-white placeholder-neutral-500"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              
              {/* Options List */}
              <div className="max-h-48 overflow-y-auto">
                {getFilteredOptions(item, index).length > 0 ? (
                  getFilteredOptions(item, index).map((option, optionIndex) => (
                    <button
                      key={optionIndex}
                      className="w-full text-left px-2 py-2 text-sm text-neutral-300 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOptionSelect(option, index);
                      }}
                    >
                      {option.label}
                    </button>
                  ))
                ) : (
                  <div className="px-2 py-2 text-sm text-neutral-500 text-center">
                    No results found
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </nav>
  );
};

export default FloatingNavbar;
