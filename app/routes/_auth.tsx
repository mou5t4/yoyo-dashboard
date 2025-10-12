import { json, redirect, type LoaderFunctionArgs } from "@remix-run/node";
import { Link, Outlet, useLoaderData, Form } from "@remix-run/react";
import { getUserId, getUser } from "~/lib/auth.server";
import { APP_NAME } from "~/lib/constants";
import { 
  Home, 
  Settings, 
  Wifi, 
  Bluetooth, 
  MapPin, 
  Phone, 
  Music, 
  Bot, 
  Calendar, 
  BarChart3,
  Menu,
  X,
  LogOut
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { useState } from "react";
import { cn } from "~/lib/utils";

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await getUserId(request);
  
  if (!userId) {
    return redirect("/");
  }

  const user = await getUser(userId);
  
  if (!user) {
    return redirect("/");
  }

  return json({ user });
}

export default function AuthLayout() {
  const { user } = useLoaderData<typeof loader>();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: Home },
    { name: "WiFi", href: "/wifi", icon: Wifi },
    { name: "Bluetooth", href: "/bluetooth", icon: Bluetooth },
    { name: "Location", href: "/location", icon: MapPin },
    { name: "Contacts", href: "/contacts", icon: Phone },
    { name: "Content", href: "/content", icon: Music },
    { name: "AI Settings", href: "/ai", icon: Bot },
    { name: "Schedule", href: "/schedule", icon: Calendar },
    { name: "Reports", href: "/reports", icon: BarChart3 },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-xl font-bold text-primary-500">{APP_NAME}</h1>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-md hover:bg-gray-100"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-white pt-16">
          <nav className="flex flex-col p-4 space-y-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-gray-100 text-gray-700"
              >
                <item.icon className="h-5 w-5" />
                <span>{item.name}</span>
              </Link>
            ))}
            <Form method="post" action="/auth/logout" className="pt-4">
              <button
                type="submit"
                className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-gray-100 text-red-600 w-full"
              >
                <LogOut className="h-5 w-5" />
                <span>Logout</span>
              </button>
            </Form>
          </nav>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex min-h-0 flex-1 flex-col border-r border-gray-200 bg-white">
          <div className="flex flex-1 flex-col overflow-y-auto pt-5 pb-4">
            <div className="flex flex-shrink-0 items-center px-4 mb-8">
              <h1 className="text-2xl font-bold text-primary-500">{APP_NAME}</h1>
            </div>
            <nav className="mt-5 flex-1 space-y-1 px-2">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className="group flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-gray-100 text-gray-700"
                >
                  <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex flex-shrink-0 border-t border-gray-200 p-4">
            <div className="flex items-center justify-between w-full">
              <div>
                <p className="text-sm font-medium text-gray-700">{user.username}</p>
                <p className="text-xs text-gray-500">Parent Account</p>
              </div>
              <Form method="post" action="/auth/logout">
                <Button variant="ghost" size="icon" type="submit" title="Logout">
                  <LogOut className="h-5 w-5" />
                </Button>
              </Form>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={cn(
        "lg:pl-64",
        "pt-16 lg:pt-0"
      )}>
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

