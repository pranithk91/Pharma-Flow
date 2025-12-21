import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Plus, X, Check } from 'lucide-react';

interface Option {
  value: string;
  label: string;
  meta?: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  allowCreate?: boolean;
  createLabel?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select an option...',
  label,
  disabled = false,
  allowCreate = true,
  createLabel = 'Add new',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);
  const displayValue = selectedOption?.label || value || '';
  
  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exactMatch = options.some(
    (opt) => opt.value.toLowerCase() === searchTerm.toLowerCase().trim()
  );

  const showCreateOption = allowCreate && searchTerm.trim() && !exactMatch;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleCreate = () => {
    const newValue = searchTerm.trim();
    if (newValue) {
      onChange(newValue);
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
  };

  return (
    <div className="relative" ref={containerRef}>
      {label && (
        <label className="block text-xs font-semibold text-surface-600 uppercase tracking-wider mb-1.5">
          {label}
        </label>
      )}

      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full px-4 py-2.5 
          bg-white border-2 border-surface-200 
          rounded-xl text-left flex items-center justify-between
          transition-all duration-200
          ${disabled 
            ? 'bg-surface-50 cursor-not-allowed opacity-60' 
            : 'hover:border-surface-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20'
          }
          ${isOpen ? 'border-primary-500 ring-2 ring-primary-500/20' : ''}
        `}
      >
        <span className={`truncate ${displayValue ? 'text-surface-800' : 'text-surface-400'}`}>
          {displayValue || placeholder}
        </span>
        <div className="flex items-center gap-2 ml-2 shrink-0">
          {value && !disabled && (
            <span
              onClick={handleClear}
              className="p-1 hover:bg-surface-100 rounded-full cursor-pointer transition-colors"
            >
              <X size={14} className="text-surface-400 hover:text-surface-600" />
            </span>
          )}
          <ChevronDown
            size={16}
            className={`text-surface-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {isOpen && (
        <div className="
          absolute z-50 w-full mt-2 
          bg-white border border-surface-200 
          rounded-2xl shadow-xl shadow-surface-200/50
          overflow-hidden
          animate-scale-in
        ">
          {/* Search Input */}
          <div className="p-3 border-b border-surface-100">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && showCreateOption) {
                    e.preventDefault();
                    handleCreate();
                  }
                }}
                placeholder="Type to search..."
                className="
                  w-full pl-10 pr-4 py-2.5 
                  bg-surface-50 border border-surface-200 
                  rounded-xl text-sm text-surface-800
                  placeholder:text-surface-400
                  focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:bg-white
                  transition-all duration-200
                "
              />
            </div>
          </div>

          {/* Options List */}
          <div className="overflow-y-auto max-h-60 p-2">
            {/* Create new option */}
            {showCreateOption && (
              <button
                type="button"
                onClick={handleCreate}
                className="
                  w-full px-4 py-3 mb-1
                  bg-gradient-to-r from-primary-50 to-primary-100/50
                  hover:from-primary-100 hover:to-primary-100
                  rounded-xl flex items-center gap-3
                  transition-all duration-200
                  border border-primary-200/50
                "
              >
                <div className="p-1.5 bg-primary-500 rounded-lg">
                  <Plus size={14} className="text-white" />
                </div>
                <div className="text-left">
                  <span className="font-medium text-primary-700 text-sm">
                    {createLabel}: "{searchTerm.trim()}"
                  </span>
                  <span className="text-xs text-primary-500 ml-2">(New Entry)</span>
                </div>
              </button>
            )}

            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={`
                    w-full px-4 py-3 rounded-xl
                    flex items-center justify-between
                    transition-all duration-150
                    ${option.value === value 
                      ? 'bg-primary-50 text-primary-700' 
                      : 'hover:bg-surface-50 text-surface-700'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    {option.value === value && (
                      <div className="p-1 bg-primary-500 rounded-md">
                        <Check size={12} className="text-white" />
                      </div>
                    )}
                    <span className="font-medium text-sm">{option.label}</span>
                  </div>
                  {option.meta && (
                    <span className="text-xs text-surface-400 bg-surface-100 px-2 py-1 rounded-md">
                      {option.meta}
                    </span>
                  )}
                </button>
              ))
            ) : !showCreateOption ? (
              <div className="px-4 py-8 text-center">
                <Search size={32} className="mx-auto text-surface-300 mb-2" />
                <p className="text-surface-500 text-sm">No options found</p>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
