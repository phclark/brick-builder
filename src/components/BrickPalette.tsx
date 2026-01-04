'use client';

import { useState, useMemo } from 'react';
import { Search, X, Grid3x3, ChevronDown, ChevronUp } from 'lucide-react';
import { BRICKS } from '@/data/bricks';
import { BRICK_CATEGORIES, BrickCategory } from '@/types/brick';
import BrickThumbnail from './BrickThumbnail';

interface BrickPaletteProps {
  className?: string;
  onBrickSelect?: (brickId: string) => void;
}

export default function BrickPalette({ className = '', onBrickSelect }: BrickPaletteProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<BrickCategory | 'all'>('all');
  const [isExpanded, setIsExpanded] = useState(true);

  // Filter bricks based on search and category
  const filteredBricks = useMemo(() => {
    return BRICKS.filter((brick) => {
      // Filter by category
      if (selectedCategory !== 'all' && brick.category !== selectedCategory) {
        return false;
      }

      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          brick.name.toLowerCase().includes(query) ||
          brick.description.toLowerCase().includes(query) ||
          brick.category.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [searchQuery, selectedCategory]);

  // Group bricks by category for display
  const groupedBricks = useMemo(() => {
    const groups: Record<BrickCategory, typeof BRICKS> = {
      basic: [],
      slopes: [],
      special: [],
    };

    filteredBricks.forEach((brick) => {
      groups[brick.category].push(brick);
    });

    return groups;
  }, [filteredBricks]);

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  return (
    <div className={`flex flex-col bg-white border-l border-slate-200 shadow-xl ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center gap-2">
          <Grid3x3 className="w-5 h-5 text-orange-500" />
          <h2 className="text-lg font-semibold text-slate-900 font-heading">
            Brick Palette
          </h2>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 rounded hover:bg-slate-200 transition-colors lg:hidden"
          aria-label={isExpanded ? 'Collapse palette' : 'Expand palette'}
        >
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-slate-600" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-600" />
          )}
        </button>
      </div>

      {/* Collapsible content */}
      <div className={`flex flex-col flex-1 overflow-hidden ${!isExpanded ? 'hidden lg:flex' : ''}`}>
        {/* Search Bar */}
        <div className="px-4 py-3 border-b border-slate-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search bricks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
            />
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-slate-200 transition-colors"
                aria-label="Clear search"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            )}
          </div>
        </div>

        {/* Category Filter */}
        <div className="px-4 py-3 border-b border-slate-200">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-orange-500 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All
            </button>
            {BRICK_CATEGORIES.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-orange-500 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>
        </div>

        {/* Brick Grid */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {filteredBricks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Grid3x3 className="w-12 h-12 text-slate-300 mb-3" />
              <p className="text-slate-600 font-medium">No bricks found</p>
              <p className="text-sm text-slate-500 mt-1">
                Try adjusting your search or filters
              </p>
            </div>
          ) : selectedCategory === 'all' ? (
            // Show categorized view when 'All' is selected
            <div className="space-y-6">
              {BRICK_CATEGORIES.map((category) => {
                const bricks = groupedBricks[category.id];
                if (bricks.length === 0) return null;

                return (
                  <div key={category.id}>
                    <h3 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">
                      {category.label}
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {bricks.map((brick) => (
                        <BrickThumbnail
                          key={brick.id}
                          brick={brick}
                          onClick={() => onBrickSelect?.(brick.id)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // Show flat grid when specific category is selected
            <div className="grid grid-cols-2 gap-3">
              {filteredBricks.map((brick) => (
                <BrickThumbnail
                  key={brick.id}
                  brick={brick}
                  onClick={() => onBrickSelect?.(brick.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer with count */}
        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50">
          <p className="text-xs text-slate-600 text-center">
            Showing <span className="font-semibold text-orange-600">{filteredBricks.length}</span>{' '}
            of <span className="font-semibold">{BRICKS.length}</span> bricks
          </p>
        </div>
      </div>
    </div>
  );
}
