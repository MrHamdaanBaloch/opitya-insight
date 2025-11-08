import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
import { 
  Camera, 
  Shield, 
  Zap, 
  Clock, 
  CheckCircle, 
  ArrowRight, 
  Phone, 
  Mail,
  Building,
  Car,
  Plane,
  Warehouse,
  MapPin,
  Star,
  Globe,
  Users,
  BarChart3,
  FileText,
  Play
} from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();
  const heroRef = useRef(null);
  const [isAnnual, setIsAnnual] = useState(false);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [mockDetections, setMockDetections] = useState([]);

  // Cursor tracking effect
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (heroRef.current) {
        const rect = heroRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Update CSS variables for cursor tracking
        document.documentElement.style.setProperty('--cursor-x', `${x}px`);
        document.documentElement.style.setProperty('--cursor-y', `${y}px`);
        
        setCursorPos({ x, y });
      }
    };

    const hero = heroRef.current;
    if (hero) {
      hero.addEventListener('mousemove', handleMouseMove);
      return () => {
        hero.removeEventListener('mousemove', handleMouseMove);
        // Clean up CSS variables
        document.documentElement.style.removeProperty('--cursor-x');
        document.documentElement.style.removeProperty('--cursor-y');
      };
    }
  }, []);

  // Mock live detections
  useEffect(() => {
    const interval = setInterval(() => {
      const plates = ['AED123', 'DXB456', 'AUH789', 'SHJ012', 'RAK345'];
      const newDetection = {
        id: Date.now(),
        plate: plates[Math.floor(Math.random() * plates.length)],
        confidence: 0.85 + Math.random() * 0.14,
        timestamp: new Date().toLocaleTimeString()
      };
      
      setMockDetections(prev => [newDetection, ...prev.slice(0, 4)]);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const benefits = [
    {
      icon: Zap,
      title: "99%+ Accuracy",
      description: "Real-time plate recognition with industry-leading precision in clear conditions"
    },
    {
      icon: Clock,
      title: "Low Latency",
      description: "Sub-100ms detection response time for instant alerts and logging"
    },
    {
      icon: Shield,
      title: "Smart Alerts",
      description: "Instant SMS & Email notifications for watchlist hits and security events"
    },
    {
      icon: BarChart3,
      title: "Data Retention",
      description: "Configurable retention periods with secure cloud storage and export options"
    }
  ];

  const pricingPlans = [
    {
      name: "Starter",
      price: 29,
      period: "camera/month",
      description: "Perfect for small parking operators and single gates",
      features: [
        "Up to 5 cameras",
        "7-day data retention",
        "Email alerts",
        "Basic dashboard",
        "Community support"
      ],
      cta: "Start Free Trial"
    },
    {
      name: "Pro",
      price: 59,
      period: "camera/month",
      description: "Best for medium operators and commercial buildings",
      features: [
        "Up to 20 cameras",
        "30-day data retention",
        "SMS + Email alerts",
        "Advanced analytics",
        "CSV/PDF exports",
        "Priority support"
      ],
      cta: "Start Free Trial",
      recommended: true
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "pricing",
      description: "For large deployments and custom integrations",
      features: [
        "Unlimited cameras",
        "Custom retention",
        "On-premise option",
        "SSO integration",
        "SLA guarantee",
        "Dedicated support"
      ],
      cta: "Contact Sales"
    }
  ];

  const industries = [
    {
      icon: Car,
      title: "Tolling & Roads",
      description: "Automated toll collection and traffic monitoring",
      roi: "85% reduction in manual processing"
    },
    {
      icon: Building,
      title: "Parking Operations",
      description: "Access control for malls, offices, and commercial spaces",
      roi: "70% faster entry/exit processing"
    },
    {
      icon: Plane,
      title: "Airports & Ports",
      description: "Security zones and restricted area access management",
      roi: "99% unauthorized access prevention"
    },
    {
      icon: Warehouse,
      title: "Logistics & Fleet",
      description: "Vehicle tracking and fleet management solutions",
      roi: "60% improvement in dispatch efficiency"
    },
    {
      icon: MapPin,
      title: "Gated Communities",
      description: "Residential and hotel guest access automation",
      roi: "90% reduction in security overhead"
    }
  ];

  const testimonials = [
    {
      name: "Ahmed Al-Rashid",
      company: "Dubai Parking Authority",
      role: "Operations Director",
      content: "Optiya INSIGHT has transformed our parking operations. The accuracy and real-time alerts have reduced unauthorized parking by 85%.",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face"
    },
    {
      name: "Fatima Al-Zahra",
      company: "Emirates Logistics",
      role: "Fleet Manager", 
      content: "The watchlist functionality and instant SMS alerts have significantly improved our security protocols across all facilities.",
      avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face"
    }
  ];

  const handleGetStarted = () => {
    navigate('/login');
  };

  const handleScheduleDemo = () => {
    // In real app, this would open a calendar booking widget
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-black/80 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
                <img src="/logo.png" alt="Optiya INSIGHT Logo" className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-xl text-white">Optiya</h1>
                <p className="text-xs text-gray-400">INSIGHT</p>
              </div>
            </div>
            
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-300 hover:text-white transition-colors">Features</a>
              <a href="#pricing" className="text-gray-300 hover:text-white transition-colors">Pricing</a>
              <a href="#industries" className="text-gray-300 hover:text-white transition-colors">Industries</a>
              <Button onClick={handleGetStarted} variant="outline" className="border-white/30 text-gray-300 hover:bg-white/10">
                Login
              </Button>
              <Button onClick={handleScheduleDemo} className="bg-blue-600 hover:bg-blue-700">
                Schedule Demo
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section 
        ref={heroRef}
        className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden hero-section"
      >
        {/* Cursor spotlight overlay */}
        <div className="absolute inset-0 pointer-events-none hero-spotlight" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-8 relative z-10">
            <div className="space-y-4">
              <Badge className="bg-blue-600/20 text-blue-400 border-blue-600/30">
                Trusted by 500+ operators across the Middle East
              </Badge>
              <h1 className="text-5xl lg:text-7xl font-bold leading-tight">
                Real-time ANPR
                <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
                  {" "}built for scale
                </span>
              </h1>
              <p className="text-xl lg:text-2xl text-gray-300 leading-relaxed max-w-4xl mx-auto">
                From single gates to city deployments. Predictable pricing. Fast alerts.
                <br />
                <span className="text-blue-400 font-semibold text-2xl">From $29 / camera / month</span> — transparent per-camera pricing.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={handleGetStarted}
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-lg px-12 py-8 group transition-all duration-200 hover:shadow-2xl hover:shadow-blue-500/40 hover:-translate-y-2 cta-button"
              >
                Start 14-day Free Trial — No Card
                <ArrowRight className="ml-2 h-6 w-6 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button 
                onClick={handleScheduleDemo}
                variant="outline"
                size="lg"
                className="border-white/30 text-gray-300 hover:bg-white/10 text-lg px-12 py-8 hover:-translate-y-2 transition-all duration-200 hover:shadow-xl hover:shadow-white/10"
              >
                <Play className="mr-2 h-6 w-6" />
                Schedule Demo
              </Button>
            </div>
            
            <div className="flex items-center justify-center space-x-8 text-sm text-gray-400">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
                99%+ accuracy
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
                Sub-100ms latency
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
                GDPR compliant
              </div>
            </div>
            
            {/* Live Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 max-w-4xl mx-auto">
              <Card className="bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 transition-all duration-200">
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-blue-400 mb-2">500+</div>
                  <div className="text-gray-300">Active Deployments</div>
                </CardContent>
              </Card>
              <Card className="bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 transition-all duration-200">
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-green-400 mb-2">2M+</div>
                  <div className="text-gray-300">Plates Processed Daily</div>
                </CardContent>
              </Card>
              <Card className="bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 transition-all duration-200">
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-purple-400 mb-2">15+</div>
                  <div className="text-gray-300">Countries Served</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Why Optiya Section */}
      <section id="features" className="py-24 bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
              Why Choose Optiya INSIGHT?
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Deployed in parking, tolling and logistics across the Middle East
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <Card key={index} className="bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/15 transition-all duration-200 hover:scale-105 group">
                  <CardContent className="p-6 text-center">
                    <div className="p-3 bg-blue-600/20 rounded-xl w-fit mx-auto mb-4 group-hover:bg-blue-600/30 transition-colors">
                      <Icon className="h-6 w-6 text-blue-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">{benefit.title}</h3>
                    <p className="text-gray-300 text-sm leading-relaxed">{benefit.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
              Transparent Pricing
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              Predictable per-camera pricing. No hidden fees.
            </p>
            
            <div className="flex items-center justify-center space-x-4">
              <span className="text-gray-300">Monthly</span>
              <Switch 
                checked={isAnnual} 
                onCheckedChange={setIsAnnual}
                className="data-[state=checked]:bg-blue-600"
              />
              <span className="text-gray-300">Annual</span>
              <Badge className="bg-green-600/20 text-green-400 border-green-600/30 ml-2">
                Save 20%
              </Badge>
            </div>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {pricingPlans.map((plan, index) => (
              <Card 
                key={index} 
                className={`relative bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/15 transition-all duration-200 hover:scale-105 ${
                  plan.recommended ? 'border-blue-500 shadow-xl shadow-blue-500/10' : ''
                }`}
              >
                {plan.recommended && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-blue-600 text-white px-4 py-1">
                      Most Popular
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl font-bold text-white">{plan.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-white">
                      ${typeof plan.price === 'number' ? (isAnnual ? Math.round(plan.price * 0.8) : plan.price) : plan.price}
                    </span>
                    {typeof plan.price === 'number' && (
                      <span className="text-gray-300">/{plan.period}</span>
                    )}
                    {typeof plan.price !== 'number' && (
                      <span className="text-gray-300"> {plan.period}</span>
                    )}
                  </div>
                  <CardDescription className="text-gray-300 mt-2">
                    {plan.description}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  <ul className="space-y-3">
                    {plan.features.map((feature, fIndex) => (
                      <li key={fIndex} className="flex items-center text-gray-300">
                        <CheckCircle className="h-4 w-4 text-green-400 mr-3 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  
                  <Button 
                    onClick={plan.name === 'Enterprise' ? handleScheduleDemo : handleGetStarted}
                    className={`w-full transition-all duration-200 hover:-translate-y-1 ${
                      plan.recommended 
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 hover:shadow-xl hover:shadow-blue-500/25' 
                        : 'bg-white/10 hover:bg-white/20 border border-white/30'
                    }`}
                  >
                    {plan.cta}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="text-center mt-12">
            <p className="text-gray-400">
              Need more than 50 cameras? <span className="text-blue-400 cursor-pointer hover:underline" onClick={handleScheduleDemo}>Contact us for volume pricing</span>
            </p>
          </div>
        </div>
      </section>

      {/* Industries Section */}
      <section id="industries" className="py-24 bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
              Built for Every Industry
            </h2>
            <p className="text-xl text-gray-300">
              Proven ROI across diverse use cases in the Middle East
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {industries.map((industry, index) => {
              const Icon = industry.icon;
              return (
                <Card key={index} className="bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/15 transition-all duration-200 hover:scale-105 group">
                  <CardContent className="p-6">
                    <div className="flex items-center mb-4">
                      <div className="p-2 bg-blue-600/20 rounded-lg mr-4 group-hover:bg-blue-600/30 transition-colors">
                        <Icon className="h-6 w-6 text-blue-400" />
                      </div>
                      <h3 className="text-xl font-semibold text-white">{industry.title}</h3>
                    </div>
                    <p className="text-gray-300 mb-4">{industry.description}</p>
                    <Badge className="bg-green-600/20 text-green-400 border-green-600/30">
                      {industry.roi}
                    </Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
              Trusted by Industry Leaders
            </h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 mb-16">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="bg-white/10 backdrop-blur-sm border-white/20">
                <CardContent className="p-6">
                  <div className="flex mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-gray-300 mb-4 italic">"{testimonial.content}"</p>
                  <div className="flex items-center">
                    <img 
                      src={testimonial.avatar} 
                      alt={testimonial.name}
                      className="w-12 h-12 rounded-full mr-4 object-cover"
                    />
                    <div>
                      <p className="text-white font-semibold">{testimonial.name}</p>
                      <p className="text-gray-400 text-sm">{testimonial.role}, {testimonial.company}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {/* Company Logos */}
          <div className="text-center">
            <p className="text-gray-400 mb-8">Powering operations for leading organizations</p>
            <div className="flex justify-center items-center space-x-12 opacity-50">
              <div className="text-2xl font-bold text-gray-500">EMAAR</div>
              <div className="text-2xl font-bold text-gray-500">DUBAI MALL</div>
              <div className="text-2xl font-bold text-gray-500">ADNOC</div>
              <div className="text-2xl font-bold text-gray-500">EMIRATES</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-blue-600/10 to-blue-800/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Join hundreds of operators who trust Optiya INSIGHT for their ANPR needs
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={handleGetStarted}
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-lg px-8 py-6 hover:shadow-xl hover:shadow-blue-500/25 hover:-translate-y-1 transition-all duration-200"
            >
              Start Your Free Trial Today
            </Button>
            <Button 
              onClick={handleScheduleDemo}
              variant="outline"
              size="lg"
              className="border-white/30 text-gray-300 hover:bg-white/10 text-lg px-8 py-6 hover:-translate-y-1 transition-all duration-200"
            >
              Schedule a Demo
            </Button>
          </div>
          
          <p className="text-gray-400 text-sm mt-6">
            No credit card required • 14-day free trial • Cancel anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black border-t border-white/10 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
                  <img src="/logo.png" alt="Optiya INSIGHT Logo" className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white">Optiya INSIGHT</h3>
                  <p className="text-xs text-gray-400">Advanced ANPR Platform</p>
                </div>
              </div>
              <p className="text-gray-400 text-sm">
                Real-time number plate recognition built for scale across the Middle East.
              </p>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API Reference</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Contact</h4>
              <div className="space-y-2 text-gray-400 text-sm">
                <div className="flex items-center">
                  <Mail className="h-4 w-4 mr-2" />
                  sales@optiya.com
                </div>
                <div className="flex items-center">
                  <Phone className="h-4 w-4 mr-2" />
                  +971 4 XXX XXXX
                </div>
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-2" />
                  Dubai, UAE
                </div>
              </div>
            </div>
          </div>
          
          <div className="border-t border-white/10 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © 2024 Optiya INSIGHT. All rights reserved.
            </p>
            <div className="flex items-center space-x-4 mt-4 md:mt-0">
              <Badge className="bg-green-600/20 text-green-400 border-green-600/30">
                GDPR Compliant
              </Badge>
              <Badge className="bg-blue-600/20 text-blue-400 border-blue-600/30">
                SOC 2 Type II
              </Badge>
            </div>
          </div>
        </div>
      </footer>
      
      <style>{`
        .hero-section {
          background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%);
        }
        
        .hero-spotlight {
          background: radial-gradient(
            800px circle at var(--cursor-x, 50%) var(--cursor-y, 50%), 
            rgba(26, 167, 255, 0.15), 
            rgba(26, 167, 255, 0.05) 30%, 
            transparent 60%
          );
          transition: background 0.1s ease-out;
        }
        
        .cta-button:hover {
          box-shadow: 
            0 20px 40px rgba(26, 167, 255, 0.4),
            0 0 100px rgba(26, 167, 255, 0.2);
        }
        
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        
        @media (prefers-reduced-motion: reduce) {
          .hero-spotlight {
            background: radial-gradient(
              800px circle at 50% 50%, 
              rgba(26, 167, 255, 0.1), 
              transparent 50%
            );
          }
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
