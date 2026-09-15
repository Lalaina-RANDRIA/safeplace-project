import unittest

from pipeline import run_pipeline


class TestPipelineIntegration(unittest.TestCase):
    def test_run_pipeline_returns_claim_verdicts_for_demo_input(self):
        text = 'Le gouvernement a annoncé une augmentation des taxes de 20%.'

        results = run_pipeline(text)

        self.assertTrue(results)
        self.assertEqual(results[0].claim.language, 'fr')
        self.assertIn(results[0].verdict.status, {'Vrai', 'Faux', 'Partiellement Faux', 'Non Vérifiable'})
        self.assertIsInstance(results[0].verdict.confidence, int)
        self.assertGreaterEqual(results[0].verdict.confidence, 0)
        self.assertLessEqual(results[0].verdict.confidence, 100)
        self.assertTrue(results[0].verdict.justification)
        self.assertTrue(results[0].verdict.sources)


if __name__ == '__main__':
    unittest.main()
