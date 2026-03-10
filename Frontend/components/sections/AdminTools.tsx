// "use client";

// import { useState } from 'react';
// import { Card } from '@/components/ui/card';
// import { Button } from '@/components/ui/button';
// import { Textarea } from '@/components/ui/textarea';
// import { Badge } from '@/components/ui/badge';
// import { ScrollArea } from '@/components/ui/scroll-area';
// import { Trash2, Eye, Terminal } from 'lucide-react';

// interface SavedFace {
//   id: number;
//   name: string;
//   image: string;
//   registeredAt: string;
// }

// export function AdminTools() {
//   const [showSavedFaces, setShowSavedFaces] = useState(false);
//   const [showConsole, setShowConsole] = useState(false);
//   const [savedFaces, setSavedFaces] = useState<SavedFace[]>([]);
//   const [consoleLog, setConsoleLog] = useState('System initialized...\nFace detection engine loaded\nReady for operations\n');

//   const loadSavedFaces = () => {
//     const faces = JSON.parse(localStorage.getItem('savedFaces') || '[]');
//     setSavedFaces(faces);
//     setShowSavedFaces(true);
//     addToConsole(`Loaded ${faces.length} saved faces`);
//   };

//   const clearDatabase = () => {
//     localStorage.removeItem('savedFaces');
//     setSavedFaces([]);
//     setShowSavedFaces(false);
//     addToConsole('Local database cleared');
//   };

//   const deleteFace = (id: number) => {
//     const updatedFaces = savedFaces.filter(face => face.id !== id);
//     setSavedFaces(updatedFaces);
//     localStorage.setItem('savedFaces', JSON.stringify(updatedFaces));
//     addToConsole(`Deleted face ID: ${id}`);
//   };

//   const addToConsole = (message: string) => {
//     const timestamp = new Date().toLocaleTimeString();
//     setConsoleLog(prev => prev + `[${timestamp}] ${message}\n`);
//   };

//   return (
//     <div className="lg:col-span-2 space-y-6">
//       <Card className="glass-card p-6 hover:shadow-2xl transition-all duration-300 border-gray-700/50">
//         <div className="flex items-center space-x-3 mb-6">
//           <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse"></div>
//           <h2 className="text-xl font-semibold text-white tracking-wide">DEBUGGING & ADMIN TOOLS</h2>
//         </div>
        
//         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//           <Button 
//             onClick={loadSavedFaces}
//             className="bg-gradient-to-r from-gray-800 to-gray-700 hover:from-gray-700 hover:to-gray-600 text-white shadow-lg hover:shadow-xl transition-all duration-300"
//             variant="outline"
//           >
//             <Eye className="mr-2 h-4 w-4" />
//             View Saved Faces
//           </Button>

//           <Button 
//             onClick={clearDatabase}
//             className="bg-gradient-to-r from-red-900 to-red-800 hover:from-red-800 hover:to-red-700 text-white border-red-700 shadow-lg hover:shadow-xl transition-all duration-300 glow-red"
//             variant="outline"
//           >
//             <Trash2 className="mr-2 h-4 w-4" />
//             Clear Local Database
//           </Button>

//           <Button 
//             onClick={() => setShowConsole(!showConsole)}
//             className="bg-gradient-to-r from-gray-800 to-gray-700 hover:from-gray-700 hover:to-gray-600 text-white shadow-lg hover:shadow-xl transition-all duration-300"
//             variant="outline"
//           >
//             <Terminal className="mr-2 h-4 w-4" />
//             Log Console
//           </Button>
//         </div>
//       </Card>

//       {showSavedFaces && (
//         <Card className="glass-card p-6 border-gray-700/50 animate-in slide-in-from-bottom-4 duration-300">
//           <div className="flex items-center justify-between mb-4">
//             <h3 className="text-lg font-semibold text-white">Saved Faces</h3>
//             <Badge variant="secondary" className="bg-gray-700 text-gray-200 shadow-lg">
//               {savedFaces.length} faces
//             </Badge>
//           </div>
          
//           <ScrollArea className="h-64">
//             <div className="space-y-3">
//               {savedFaces.length === 0 ? (
//                 <div className="text-center py-12">
//                   <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
//                     <Eye className="w-8 h-8 text-gray-500" />
//                   </div>
//                   <p className="text-gray-400">No saved faces found</p>
//                 </div>
//               ) : (
//                 savedFaces.map((face) => (
//                   <div key={face.id} className="flex items-center space-x-4 p-4 bg-gradient-to-r from-gray-800 to-gray-700 rounded-lg border border-gray-600/50 hover:from-gray-700 hover:to-gray-600 transition-all duration-300 shadow-lg">
//                     <img 
//                       src={face.image} 
//                       alt={face.name}
//                       className="w-14 h-14 rounded-full object-cover border-2 border-gray-500 shadow-lg"
//                     />
//                     <div className="flex-1">
//                       <p className="text-white font-semibold">{face.name}</p>
//                       <p className="text-gray-300 text-sm">
//                         {new Date(face.registeredAt).toLocaleDateString()}
//                       </p>
//                     </div>
//                     <Button
//                       onClick={() => deleteFace(face.id)}
//                       size="sm"
//                       className="bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 glow-red"
//                     >
//                       <Trash2 className="h-4 w-4" />
//                     </Button>
//                   </div>
//                 ))
//               )}
//             </div>
//           </ScrollArea>
//         </Card>
//       )}

//       {showConsole && (
//         <Card className="glass-card p-6 border-gray-700/50 animate-in slide-in-from-bottom-4 duration-300">
//           <div className="flex items-center space-x-3 mb-4">
//             <Terminal className="w-5 h-5 text-green-400" />
//             <h3 className="text-lg font-semibold text-white">Console Log</h3>
//           </div>
//           <Textarea
//             value={consoleLog}
//             readOnly
//             className="bg-black border-gray-600 text-green-400 font-mono text-sm h-48 resize-none shadow-inner focus:ring-2 focus:ring-green-500/20"
//             placeholder="Console output will appear here..."
//           />
//         </Card>
//       )}
//     </div>
//   );
// }