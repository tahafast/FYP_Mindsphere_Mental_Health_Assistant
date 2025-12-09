import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getBreathingTechniques, BreathingTechnique } from "@/lib/api";
import { Wind, Check } from "lucide-react";
import { BreathingExercise } from "@/components/breathing";

export function BreathingLibrary() {
    const [techniques, setTechniques] = useState<BreathingTechnique[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTechnique, setSelectedTechnique] = useState<BreathingTechnique | null>(null);
    const [showExercise, setShowExercise] = useState(false);

    useEffect(() => {
        fetchTechniques();
    }, []);

    const fetchTechniques = async () => {
        try {
            const data = await getBreathingTechniques();
            setTechniques(data.techniques);
        } catch (error) {
            console.error("Failed to fetch techniques", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectTechnique = (technique: BreathingTechnique) => {
        setSelectedTechnique(technique);
        const preset = {
            preset_id: technique.id,
            name: technique.name,
            technique_id: technique.id,
            config: technique,
            is_builtin: true
        };
        setShowExercise(true);
    };

    const getTechniquePattern = (technique: BreathingTechnique): string => {
        return technique.steps
            .map(step => `${step.type.charAt(0).toUpperCase()}${step.duration}`)
            .join('-');
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 max-w-6xl">
            <div className="mb-8">
                <h1 className="text-4xl font-bold mb-2">Breathing Exercise Library</h1>
                <p className="text-lg text-muted-foreground">
                    Clinician-backed breathing techniques for calm, focus, and well-being
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {techniques.map((technique) => (
                    <Card
                        key={technique.id}
                        className="hover:shadow-lg transition-all duration-200 hover:scale-[1.02]"
                    >
                        <CardHeader>
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <CardTitle className="text-xl mb-2">{technique.name}</CardTitle>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-sm font-mono bg-primary/10 text-primary px-2 py-1 rounded">
                                            {getTechniquePattern(technique)}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {technique.use_case}
                                        </span>
                                    </div>
                                </div>
                                <Wind className="h-8 w-8 text-primary/40" />
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                {technique.description}
                            </p>

                            {/* Step Preview */}
                            <div className="space-y-2">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                    Pattern
                                </p>
                                <div className="grid grid-cols-4 gap-2">
                                    {technique.steps.map((step, idx) => (
                                        <div
                                            key={idx}
                                            className="text-center p-2 rounded bg-accent/50 border border-border"
                                        >
                                            <p className="text-xs font-medium capitalize">{step.type}</p>
                                            <p className="text-lg font-bold text-primary">{step.duration}s</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Recommended For */}
                            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                                <p className="text-xs font-medium text-primary mb-1">Recommended for:</p>
                                <p className="text-sm">{technique.use_case}</p>
                            </div>

                            <Button
                                className="w-full"
                                onClick={() => handleSelectTechnique(technique)}
                            >
                                <Check className="h-4 w-4 mr-2" />
                                Try This Exercise
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Info Section */}
            <Card className="mt-8 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-2">About Breathing Exercises</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                        Controlled breathing exercises activate your parasympathetic nervous system,
                        helping reduce stress, lower heart rate, and promote relaxation. Regular practice
                        can improve emotional regulation, sleep quality, and overall well-being.
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        <strong>Tips for best results:</strong> Find a quiet space, sit or lie comfortably,
                        and focus on the rhythm. If you feel lightheaded, pause and return to normal breathing.
                    </p>
                </CardContent>
            </Card>

            {/* Breathing Exercise Modal */}
            {selectedTechnique && (
                <BreathingExercise
                    isOpen={showExercise}
                    onClose={() => {
                        setShowExercise(false);
                        setSelectedTechnique(null);
                    }}
                    initialPreset={{
                        preset_id: selectedTechnique.id,
                        name: selectedTechnique.name,
                        technique_id: selectedTechnique.id,
                        config: selectedTechnique,
                        is_builtin: true
                    }}
                />
            )}
        </div>
    );
}
