import {
  TreePine, Trash2, Recycle, Bike, Zap, Megaphone,
  Sprout, Bug, Salad, Droplets, Ban, BookOpen, Wind, Heart
} from 'lucide-react';

export const ECO_ACTIVITIES = [
  {
    id: 'tree_planting',
    label: 'Tree Planting',
    emoji: '🌳',
    icon: TreePine,
    credits: 30,
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    iconColor: 'text-emerald-600',
    description: 'Plant trees, saplings or seeds',
    subcategories: [
      'Native tree planting',
      'Fruit tree planting', 
      'Reforestation drive',
      'Seed bombing',
      'Mangrove planting'
    ]
  },
  {
    id: 'cleanup',
    label: 'Clean-up Drive',
    emoji: '🧹',
    icon: Trash2,
    credits: 25,
    color: 'bg-sky-50 text-sky-700 border-sky-200',
    iconColor: 'text-sky-600',
    description: 'Clean beaches, roads, rivers or parks',
    subcategories: [
      'Beach cleanup',
      'River/lake cleanup',
      'Road/street cleanup',
      'Park cleanup',
      'Plastic collection drive'
    ]
  },
  {
    id: 'upcycling',
    label: 'Upcycling & Repair',
    emoji: '♻️',
    icon: Recycle,
    credits: 20,
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    iconColor: 'text-amber-600',
    description: 'Repair, reuse or upcycle items',
    subcategories: [
      'Clothing upcycle',
      'Furniture repair',
      'Electronics repair',
      'DIY upcycle project',
      'Donation / redistribution'
    ]
  },
  {
    id: 'transport',
    label: 'Sustainable Transport',
    emoji: '🚲',
    icon: Bike,
    credits: 15,
    color: 'bg-violet-50 text-violet-700 border-violet-200',
    iconColor: 'text-violet-600',
    description: 'Use eco-friendly transport',
    subcategories: [
      'Cycling instead of driving',
      'Public transport use',
      'Carpooling',
      'Walking instead of driving',
      'EV usage'
    ]
  },
  {
    id: 'energy',
    label: 'Energy Saving',
    emoji: '⚡',
    icon: Zap,
    credits: 10,
    color: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    iconColor: 'text-yellow-600',
    description: 'Reduce energy or water usage',
    subcategories: [
      'Solar panel installation',
      'Switching to LED lights',
      'Reducing AC/heating use',
      'Water conservation',
      'Unplugging idle devices'
    ]
  },
  {
    id: 'advocacy',
    label: 'Community Advocacy',
    emoji: '📣',
    icon: Megaphone,
    credits: 10,
    color: 'bg-rose-50 text-rose-700 border-rose-200',
    iconColor: 'text-rose-600',
    description: 'Spread awareness and educate',
    subcategories: [
      'Awareness campaign',
      'Workshop or talk',
      'Social media campaign',
      'Petition or letter writing',
      'School/college program'
    ]
  },
  {
    id: 'composting',
    label: 'Composting',
    emoji: '🌱',
    icon: Sprout,
    credits: 20,
    color: 'bg-lime-50 text-lime-700 border-lime-200',
    iconColor: 'text-lime-600',
    description: 'Compost food and organic waste',
    subcategories: [
      'Home composting',
      'Community compost bin',
      'Vermicomposting',
      'Food waste reduction',
      'Zero-waste cooking'
    ]
  },
  {
    id: 'wildlife',
    label: 'Wildlife Protection',
    emoji: '🦋',
    icon: Bug,
    credits: 25,
    color: 'bg-orange-50 text-orange-700 border-orange-200',
    iconColor: 'text-orange-600',
    description: 'Protect and support local wildlife',
    subcategories: [
      'Bird feeder/bath setup',
      'Wildlife rescue',
      'Habitat restoration',
      'Anti-poaching awareness',
      'Pollinator garden'
    ]
  },
  {
    id: 'sustainable_food',
    label: 'Sustainable Food',
    emoji: '🥗',
    icon: Salad,
    credits: 15,
    color: 'bg-teal-50 text-teal-700 border-teal-200',
    iconColor: 'text-teal-600',
    description: 'Choose sustainable food options',
    subcategories: [
      'Plant-based meal',
      'Local/organic food purchase',
      'Growing own food',
      'Reducing food waste',
      'Supporting local farmers'
    ]
  },
  {
    id: 'water',
    label: 'Water Conservation',
    emoji: '💧',
    icon: Droplets,
    credits: 15,
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    iconColor: 'text-blue-600',
    description: 'Save and protect water resources',
    subcategories: [
      'Rainwater harvesting',
      'Fixing water leaks',
      'Reduced shower time',
      'Grey water recycling',
      'Watershed protection'
    ]
  },
  {
    id: 'plastic_free',
    label: 'Plastic-Free Living',
    emoji: '🚫',
    icon: Ban,
    credits: 15,
    color: 'bg-red-50 text-red-700 border-red-200',
    iconColor: 'text-red-600',
    description: 'Eliminate single-use plastics',
    subcategories: [
      'Reusable bag/bottle use',
      'Refusing plastic straws',
      'Plastic-free shopping',
      'Replacing plastic packaging',
      'Zero-waste challenge'
    ]
  },
  {
    id: 'education',
    label: 'Eco Education',
    emoji: '📚',
    icon: BookOpen,
    credits: 10,
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    iconColor: 'text-indigo-600',
    description: 'Learn and teach sustainability',
    subcategories: [
      'Attended eco workshop',
      'Read sustainability book',
      'Completed online course',
      'Taught others about environment',
      'Visited nature reserve'
    ]
  },
  {
    id: 'air_quality',
    label: 'Air Quality',
    emoji: '🌬️',
    icon: Wind,
    credits: 20,
    color: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    iconColor: 'text-cyan-600',
    description: 'Improve local air quality',
    subcategories: [
      'Air purifying plants',
      'Stopped open burning',
      'Carpooling to reduce emissions',
      'Anti-burning awareness',
      'Indoor air quality improvement'
    ]
  },
  {
    id: 'donation',
    label: 'Eco Donation',
    emoji: '💚',
    icon: Heart,
    credits: 20,
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    iconColor: 'text-emerald-600',
    description: 'Donate to environmental causes',
    subcategories: [
      'Donated to env NGO',
      'Crowdfunded eco project',
      'Sponsored tree planting',
      'Funded wildlife conservation',
      'Supported clean energy project'
    ]
  }
];
