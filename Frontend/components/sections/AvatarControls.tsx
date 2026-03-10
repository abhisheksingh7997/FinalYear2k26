// "use client";

// import { useState } from 'react';
// import { Card } from '@/components/ui/card';
// import { Button } from '@/components/ui/button';
// import { Switch } from '@/components/ui/switch';
// import { Label } from '@/components/ui/label';

// export function AvatarControls() {
//   const [avatarSyncEnabled, setAvatarSyncEnabled] = useState(false);
//   const [selectedAvatarStyle, setSelectedAvatarStyle] = useState('default');

//   return (
//     <Card className="glass-card p-6 hover:shadow-2xl transition-all duration-300 border-gray-700/50">
//       <div className="flex items-center space-x-3 mb-6">
//         <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse"></div>
//         <h2 className="text-xl font-semibold text-white tracking-wide">AVATAR & 3D RENDERING CONTROLS</h2>
//       </div>
      
//       <div className="space-y-6">
//         <div className="flex items-center space-x-3">
//           <Switch
//             id="avatar-sync"
//             checked={avatarSyncEnabled}
//             onCheckedChange={setAvatarSyncEnabled}
//             className="data-[state=checked]:bg-purple-600 data-[state=checked]:shadow-lg data-[state=checked]:glow-blue"
//           />
//           <Label htmlFor="avatar-sync" className="text-gray-200 font-medium">
//             Enable Avatar Sync
//           </Label>
//         </div>

//         <Button 
//           className="w-full bg-gradient-to-r from-gray-800 to-gray-700 hover:from-gray-700 hover:to-gray-600 text-white border-gray-600 shadow-lg hover:shadow-xl transition-all duration-300"
//           variant="outline"
//         >
//           Choose Avatar Style
//         </Button>

//         <div className="flex justify-center">
//           <div className="relative w-36 h-36 bg-gradient-to-br from-gray-900 to-black rounded-xl border border-gray-600 flex items-center justify-center shadow-inner hover:shadow-lg transition-all duration-300">
//             {/* 3D Wireframe Face SVG */}
//             <svg 
//               width="90" 
//               height="90" 
//               viewBox="0 0 100 100" 
//               className="text-gray-300 hover:text-white transition-colors duration-300"
//               fill="none"
//               stroke="currentColor"
//               strokeWidth="0.8"
//             >
//               {/* Face outline */}
//               <ellipse cx="50" cy="45" rx="25" ry="30" />
              
//               {/* Grid lines for 3D effect */}
//               <path d="M25 35 Q50 30 75 35" />
//               <path d="M25 45 Q50 40 75 45" />
//               <path d="M25 55 Q50 50 75 55" />
//               <path d="M25 65 Q50 60 75 65" />
              
//               {/* Vertical lines */}
//               <path d="M35 20 Q35 40 35 70" />
//               <path d="M50 15 Q50 45 50 75" />
//               <path d="M65 20 Q65 40 65 70" />
              
//               {/* Eyes */}
//               <circle cx="42" cy="35" r="2" fill="currentColor" />
//               <circle cx="58" cy="35" r="2" fill="currentColor" />
              
//               {/* Nose */}
//               <path d="M50 40 L48 50 L52 50 Z" fill="none" />
              
//               {/* Mouth */}
//               <path d="M45 55 Q50 60 55 55" />
//             </svg>
//             <div className="absolute inset-0 bg-gradient-to-t from-purple-500/10 to-transparent rounded-xl"></div>
//           </div>
//         </div>

//         {avatarSyncEnabled && (
//           <div className="text-center p-3 bg-green-900/30 border border-green-500/30 rounded-lg">
//             <div className="flex items-center justify-center space-x-2">
//               <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
//               <span className="text-sm text-green-400 font-medium">Avatar sync is active</span>
//             </div>
//           </div>
//         )}
//       </div>
//     </Card>
//   );
// }