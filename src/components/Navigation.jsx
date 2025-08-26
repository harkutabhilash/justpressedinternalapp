// src/components/Navigation.jsx
"use client";

import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Button } from "../packages/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "../packages/ui/sheet";
import { cn } from "../packages/ui/utils";
import {
  BarChart3,
  Factory,
  Package as PackageIcon,
  Warehouse,
  DollarSign,
  LogOut,
  User,
  Menu,
} from "lucide-react";
import logo from "../appImages/justpressedLogo.png";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { to: "/production", label: "Production", icon: Factory },
  { to: "/bottling", label: "Bottling", icon: PackageIcon },
  { to: "/inventory", label: "Inventory", icon: Warehouse },
  { to: "/cash", label: "Cash", icon: DollarSign },
];

export default function Navigation({ username, onLogout }) {
  const [open, setOpen] = React.useState(false);
  const { pathname } = useLocation();
  const activeItem = NAV_ITEMS.find(i => pathname.startsWith(i.to));
  const pageTitle = activeItem?.label ?? "";

 const MenuItems = ({ isMobile = false }) => (
   <div className={isMobile ? "space-y-2" : "flex gap-2"}>
     {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
       <NavLink
         key={to}
         to={to}
         end
         onClick={() => isMobile && setOpen(false)}
         className={({ isActive }) =>
           cn(
             // chip-style button, Figma-like states
             "inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium transition-colors",
             isMobile ? "w-full justify-start" : "",
             // Figma states
             isActive
               ? "bg-blue-600 text-white hover:bg-blue-600"
               : "text-gray-800 hover:bg-gray-100"
           )
         }
       >
         <Icon size={16} />
         {label}
       </NavLink>
     ))}
   </div>
 );

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Left: Logo + desktop nav */}
        <div className="flex items-center gap-4">
   {/* Mobile trigger on the LEFT */}
   <Sheet open={open} onOpenChange={setOpen}>
     <SheetTrigger asChild>
       <Button variant="outline" size="icon" className="md:hidden">
         <Menu size={20} />
       </Button>
     </SheetTrigger>
     <SheetContent side="left" className="w-64 bg-white">
       <div className="space-y-6 mt-6">
         <div className="flex items-center gap-2 text-sm text-gray-600 pb-4 border-b">
           <User size={16} className="text-blue-600" />
           {username}
         </div>
         <div>
           <h3 className="font-medium mb-3">Navigation</h3>
           <MenuItems isMobile />
         </div>
         <Button
           variant="outline"
           onClick={() => {
             setOpen(false);
             onLogout();
           }}
           className="w-full flex items-center gap-2 mt-6 rounded-xl"
         >
           <LogOut size={16} />
           Logout
         </Button>
       </div>
     </SheetContent>
   </Sheet>

   <img src={logo} alt="Just Pressed" className="h-8 w-auto" />
          {/* Mobile page title beside logo */}
          <span className="md:hidden text-lg font-semibold">{pageTitle}</span>
   <nav className="hidden md:block">
     <MenuItems />
   </nav>
 </div>

        {/* Right: user + logout + mobile trigger */}
        <div className="flex items-center gap-4">
          {/* <div className="flex items-center gap-2 text-sm text-gray-600">
            <User size={16} className="text-blue-600" />
            <span className="hidden sm:inline">{username}</span>
          </div> */}

          <Button variant="outline" onClick={onLogout} className="hidden sm:flex items-center gap-2">
            <LogOut size={16} />
            <span className="hidden md:inline">Logout</span>
          </Button>

          
        </div>
      </div>
    </div>
  );
}
